import { Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import { RedisService } from '../common/redis/redis.service.js';
import { PrismaService } from '../database/prisma.service.js';

interface StoredDocumentPresence {
  userId: UUID;
  socketIds: string[];
  name: string;
  status: 'viewing' | 'editing';
  isTyping: boolean;
  cursorPosition?: number;
  selectionEnd?: number;
  lastActiveAt: number;
  avatarPath?: string;
}

const ADD_PRESENCE_SOCKET_SCRIPT = `
  local raw = redis.call('GET', KEYS[1])
  local data = {}

  if raw then
    data = cjson.decode(raw)
  end

  local userId = ARGV[1]
  local socketId = ARGV[2]
  local now = tonumber(ARGV[3])
  local ttl = tonumber(ARGV[4])
  local avatarPath = ARGV[5]
  local name = ARGV[6]

  if not data[userId] then
    data[userId] = {
      userId = userId,
      socketIds = {},
      status = 'viewing',
      isTyping = false,
      lastActiveAt = now,
      avatarPath = cjson.null,
      name = 'Collaborator',
      cursorPosition = cjson.null,
      selectionEnd = cjson.null,
      isTyping = false
    }
  end

  local presence = data[userId]

  local found = false
  for _, id in ipairs(presence.socketIds) do
    if id == socketId then
      found = true
      break
    end
  end

  if not found then
    table.insert(presence.socketIds, socketId)
  end

  if avatarPath ~= '' then
    presence.avatarPath = avatarPath
  end

  if name ~= '' then
    presence.name = name
  end

  presence.lastActiveAt = now

  redis.call('SET', KEYS[1], cjson.encode(data), 'EX', ttl)

  return cjson.encode(data)
`;

const REMOVE_PRESENCE_SOCKET_SCRIPT = `
  local raw = redis.call('GET', KEYS[1])

  if not raw then
    return cjson.encode({ userLeft = false })
  end

  local data = cjson.decode(raw)
  local userId = ARGV[1]
  local socketId = ARGV[2]
  local ttl = tonumber(ARGV[3])

  local presence = data[userId]

  if not presence then
    return cjson.encode({ userLeft = false })
  end

  local remainingSockets = {}

  for _, id in ipairs(presence.socketIds) do
    if id ~= socketId then
      table.insert(remainingSockets, id)
    end
  end

  presence.socketIds = remainingSockets

  local userLeft = (#remainingSockets == 0)

  if userLeft then
    data[userId] = nil
  end

  if next(data) == nil then
    redis.call('DEL', KEYS[1])
  else
    redis.call('SET', KEYS[1], cjson.encode(data), 'EX', ttl)
  end

  return cjson.encode({ userLeft = userLeft })
`;

const UPDATE_PRESENCE_FIELD_SCRIPT = `
  local raw = redis.call('GET', KEYS[1])

  if not raw then
    return nil
  end

  local data = cjson.decode(raw)
  local userId = ARGV[1]
  local field = ARGV[2]
  local value = ARGV[3]
  local now = tonumber(ARGV[4])
  local ttl = tonumber(ARGV[5])
  local path = tostring(ARGV[6])

  local presence = data[userId]

  if not presence then
    return cjson.encode(data)
  end

  if field == 'status' then
    if value ~= 'viewing' and value ~= 'editing' then
      return redis.error_reply('Invalid presence status')
    end

    presence.status = value
  elseif field == 'isTyping' then
    presence.isTyping = (value == 'true')
  elseif field == 'cursorPosition' then
    presence.cursorPosition = tonumber(value)
  elseif field == 'selectionEnd' then
    presence.selectionEnd = tonumber(value)
  else
    return redis.error_reply('Invalid presence field')
  end

  presence.lastActiveAt = now

  redis.call('SET', KEYS[1], cjson.encode(data), 'EX', ttl)

  return cjson.encode(data)
`;

const UPDATE_CURSOR_SCRIPT = `
  local raw = redis.call('GET', KEYS[1])

  if not raw then
    return nil
  end

  local data = cjson.decode(raw)
  local userId = ARGV[1]
  local position = tonumber(ARGV[2])
  local selectionEnd = tonumber(ARGV[3])
  local now = tonumber(ARGV[4])
  local ttl = tonumber(ARGV[5])
  local path = tostring(ARGV[6])

  local presence = data[userId]

  if not presence then
    return cjson.encode(data)
  end

  if not position or not selectionEnd
    or position < 0 or selectionEnd < 0 then
    return redis.error_reply('Invalid cursor position')
  end

  presence.cursorPosition = position
  presence.selectionEnd = selectionEnd
  presence.lastActiveAt = now

  redis.call('SET', KEYS[1], cjson.encode(data), 'EX', ttl)

  return cjson.encode(data)
`;

const PRESENCE_KEY_PREFIX = 'collaboration:presence:';
const PRESENCE_TTL_SECONDS = 24 * 60 * 60;

@Injectable()
export class PresenceService {
  //   private readonly documents = new Map<UUID, Map<UUID, DocumentPresence>>();

  constructor(
    private readonly redisService: RedisService,
    private readonly prismaService: PrismaService,
  ) {}

  private getPresenceKey(documentId: UUID): string {
    return `${PRESENCE_KEY_PREFIX}${documentId}`;
  }

  //   joinDocument(documentId: UUID, userId: UUID, socketId: string): void {
  //     let users = this.documents.get(documentId);

  //     if (!users) {
  //       users = new Map();
  //       this.documents.set(documentId, users);
  //     }

  //     let presence = users.get(userId);

  //     if (!presence) {
  //       presence = {
  //         userId,
  //         socketIds: new Set(),
  //         status: 'viewing',
  //         isTyping: false,
  //         lastActiveAt: Date.now(),
  //       };

  //       users.set(userId, presence);
  //     }

  //     presence.socketIds.add(socketId);
  //     presence.lastActiveAt = Date.now();
  //   }

  // implemented with redis lua for atomicity
  async joinDocument(
    documentId: UUID,
    userId: UUID,
    socketId: string,
    avatarPath: string,
    name: string,
  ): Promise<void> {
    const key = this.getPresenceKey(documentId);

    const res = await this.redisService.updateJsonAtomically(
      key,
      ADD_PRESENCE_SOCKET_SCRIPT,
      [
        userId,
        socketId,
        String(Date.now()),
        String(PRESENCE_TTL_SECONDS),
        avatarPath,
        name,
      ],
    );
  }

  //   leaveDocument(documentId: UUID, userId: UUID, socketId: string): void {
  //     const users = this.documents.get(documentId);
  //     const presence = users?.get(userId);

  //     if (!users || !presence) {
  //       return;
  //     }

  //     presence.socketIds.delete(socketId);

  //     if (presence.socketIds.size === 0) {
  //       users.delete(userId);
  //     }

  //     if (users.size === 0) {
  //       this.documents.delete(documentId);
  //     }
  //   }

  // added lua redis script for atomicity
  async leaveDocument(
    documentId: UUID,
    userId: UUID,
    socketId: string,
  ): Promise<boolean> {
    const key = this.getPresenceKey(documentId);

    const result = await this.redisService.updateJsonAtomically<{
      userLeft: boolean;
    }>(key, REMOVE_PRESENCE_SOCKET_SCRIPT, [
      userId,
      socketId,
      String(PRESENCE_TTL_SECONDS),
    ]);

    return result?.userLeft ?? false;
  }

  //   setStatus(
  //     documentId: UUID,
  //     userId: UUID,
  //     status: 'viewing' | 'editing',
  //   ): void {
  //     const presence = this.documents.get(documentId)?.get(userId);

  //     if (!presence) {
  //       return;
  //     }

  //     presence.status = status;
  //     presence.lastActiveAt = Date.now();
  //   }

  // lua script
  async setStatus(
    documentId: UUID,
    userId: UUID,
    status: 'viewing' | 'editing',
  ): Promise<void> {
    await this.redisService.updateJsonAtomically(
      this.getPresenceKey(documentId),
      UPDATE_PRESENCE_FIELD_SCRIPT,
      [
        userId,
        'status',
        status,
        String(Date.now()),
        String(PRESENCE_TTL_SECONDS),
      ],
    );
  }

  //   setCursor(
  //     documentId: UUID,
  //     userId: UUID,
  //     position: number,
  //     selectionEnd: number,
  //   ): void {
  //     const presence = this.documents.get(documentId)?.get(userId);

  //     if (!presence) {
  //       return;
  //     }

  //     presence.cursorPosition = position;
  //     presence.selectionEnd = selectionEnd;
  //     presence.lastActiveAt = Date.now();
  //   }

  //  lua script
  //   async setCursor(
  //     documentId: UUID,
  //     userId: UUID,
  //     position: number,
  //     selectionEnd: number,
  //   ): Promise<void> {
  //     const key = this.getPresenceKey(documentId);

  //     await this.redisService.updateJsonAtomically(
  //       key,
  //       UPDATE_PRESENCE_FIELD_SCRIPT,
  //       [
  //         userId,
  //         'cursorPosition',
  //         String(position),
  //         String(Date.now()),
  //         String(PRESENCE_TTL_SECONDS),
  //       ],
  //     );

  //     await this.redisService.updateJsonAtomically(
  //       key,
  //       UPDATE_PRESENCE_FIELD_SCRIPT,
  //       [
  //         userId,
  //         'selectionEnd',
  //         String(selectionEnd),
  //         String(Date.now()),
  //         String(PRESENCE_TTL_SECONDS),
  //       ],
  //     );
  //   }

  async setCursor(
    documentId: UUID,
    userId: UUID,
    position: number,
    selectionEnd: number,
  ): Promise<void> {
    await this.redisService.updateJsonAtomically(
      this.getPresenceKey(documentId),
      UPDATE_CURSOR_SCRIPT,
      [
        userId,
        String(position),
        String(selectionEnd),
        String(Date.now()),
        String(PRESENCE_TTL_SECONDS),
      ],
    );
  }

  //   getDocumentPresence(documentId: UUID) {
  //     const users = this.documents.get(documentId);

  //     return {
  //       documentId,
  //       totalActiveUsers: users?.size ?? 0,
  //       users: Array.from(users?.values() ?? []).map((presence) => ({
  //         userId: presence.userId,
  //         status: presence.status,
  //         isTyping: presence.isTyping,
  //         cursorPosition: presence.cursorPosition,
  //         selectionEnd: presence.selectionEnd,
  //         lastActiveAt: presence.lastActiveAt,
  //       })),
  //     };
  //   }

  // because added redis for atomicity

  async getDocumentPresence(documentId: UUID) {
    const data = await this.redisService.getCache<
      Record<string, StoredDocumentPresence>
    >(this.getPresenceKey(documentId));

    const users = Object.values(data ?? {});

    return {
      documentId,
      totalActiveUsers: users.length,
      users: users.map((presence) => ({
        userId: presence.userId,
        name: presence?.name ?? '',
        status: presence.status,
        isTyping: presence.isTyping,
        cursorPosition: presence.cursorPosition,
        selectionEnd: presence.selectionEnd,
        lastActiveAt: presence.lastActiveAt,
        avatarPath: presence?.avatarPath ?? '',
      })),
    };
  }

  //   getUserStatus(documentId: UUID, userId: UUID) {
  //     const presence = this.documents.get(documentId)?.get(userId);

  //     return presence
  //       ? {
  //           userId: presence.userId,
  //           status: presence.status,
  //           isTyping: presence.isTyping,
  //           cursorPosition: presence.cursorPosition,
  //           selectionEnd: presence.selectionEnd,
  //           lastActiveAt: presence.lastActiveAt,
  //         }
  //       : null;
  //   }

  //  redis actomicity
  async getUserStatus(documentId: UUID, userId: UUID) {
    const data = await this.redisService.getCache<
      Record<string, StoredDocumentPresence>
    >(this.getPresenceKey(documentId));

    const presence = data?.[userId];

    return presence
      ? {
          userId: presence.userId,
          status: presence.status,
          isTyping: presence.isTyping,
          cursorPosition: presence.cursorPosition,
          selectionEnd: presence.selectionEnd,
          lastActiveAt: presence.lastActiveAt,
        }
      : null;
  }

  //   setTyping(documentId: UUID, userId: UUID, isTyping: boolean): void {
  //     const presence = this.documents.get(documentId)?.get(userId);

  //     if (!presence) {
  //       return;
  //     }

  //     presence.isTyping = isTyping;
  //     presence.lastActiveAt = Date.now();
  //   }

  // lua script
  async setTyping(
    documentId: UUID,
    userId: UUID,
    isTyping: boolean,
  ): Promise<void> {
    await this.redisService.updateJsonAtomically(
      this.getPresenceKey(documentId),
      UPDATE_PRESENCE_FIELD_SCRIPT,
      [
        userId,
        'isTyping',
        String(isTyping),
        String(Date.now()),
        String(PRESENCE_TTL_SECONDS),
      ],
    );
  }

  //   getTypingUsers(documentId: UUID) {
  //     const users = this.documents.get(documentId);

  //     return Array.from(users?.values() ?? [])
  //       .filter((presence) => presence.isTyping)
  //       .map((presence) => ({
  //         userId: presence.userId,
  //         status: presence.status,
  //       }));
  //   }

  //  redis actomicity
  async getTypingUsers(documentId: UUID) {
    const data = await this.redisService.getCache<
      Record<string, StoredDocumentPresence>
    >(this.getPresenceKey(documentId));

    return Object.values(data ?? {})
      .filter((presence) => presence.isTyping)
      .map((presence) => ({
        userId: presence.userId,
        status: presence.status,
      }));
  }
}
