import { Test, TestingModule } from '@nestjs/testing';
import { OutboxDispatcherService as OutboxService } from './outbox-dispatcher.service.js';

describe('OutboxService', () => {
  let service: OutboxService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OutboxService],
    }).compile();

    service = module.get<OutboxService>(OutboxService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
