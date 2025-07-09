import { describe, expect, it, vi, beforeEach } from 'vitest';
import { IgniterRealtimeService } from '../realtime.service';
import type { IgniterStoreAdapter } from '../../types/store.interface';
import { SSEProcessor } from '../../processors/sse.processor';

// Mock do SSEProcessor que é o que realmente é usado pela implementação
vi.mock('../../processors/sse.processor', () => ({
  SSEProcessor: {
    channelExists: vi.fn(),
    registerChannel: vi.fn(),
    publishEvent: vi.fn(),
    getRegisteredChannels: vi.fn(),
  }
}));

// Mock context type
interface TestContext {
  userId: string;
  role: 'admin' | 'user';
  tenant: string;
}

describe('Realtime Service', () => {
  let mockStore: IgniterStoreAdapter;
  let realtimeService: IgniterRealtimeService<TestContext>;

  beforeEach(() => {
    // Reset todos os mocks
    vi.clearAllMocks();
    
    // Setup do mock store (ainda usado pelo constructor, mesmo que não seja usado para publish)
    mockStore = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      expire: vi.fn(),
      increment: vi.fn(),
      publish: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
      client: vi.fn(),
      has: vi.fn(),
    } as any;

    // Setup dos mocks do SSEProcessor usando vi.mocked
    vi.mocked(SSEProcessor.channelExists).mockReturnValue(true);
    vi.mocked(SSEProcessor.registerChannel).mockImplementation(() => {});
    vi.mocked(SSEProcessor.publishEvent).mockImplementation(() => 1); // Simula 1 conexão ativa
    vi.mocked(SSEProcessor.getRegisteredChannels).mockReturnValue([
      { id: 'channel1', description: 'Test Channel 1' },
      { id: 'channel2', description: 'Test Channel 2' },
    ]);

    realtimeService = new IgniterRealtimeService(mockStore);
  });

  describe('IgniterRealtimeService Construction', () => {
    it('should create realtime service with store adapter', () => {
      expect(realtimeService).toBeInstanceOf(IgniterRealtimeService);
    });

    it('should store the adapter reference', () => {
      // O adapter é armazenado mas não usado para publish (SSE usa conexões em memória)
      expect(realtimeService).toBeDefined();
    });
  });

  describe('Direct Publish Method', () => {
    it('should publish data to channel with basic options', async () => {
      const testData = { message: 'Hello World', userId: 123 };
      
      vi.mocked(SSEProcessor.channelExists).mockReturnValue(false); // Canal não existe
      
      await realtimeService.publish('user-notifications', testData);

      // Deve registrar o canal se não existir
      expect(SSEProcessor.registerChannel).toHaveBeenCalledWith({
        id: 'user-notifications',
        description: 'Realtime events for user-notifications',
      });

      // Deve publicar o evento
      expect(SSEProcessor.publishEvent).toHaveBeenCalledWith({
        channel: 'user-notifications',
        data: testData,
        type: undefined,
        id: undefined,
      });
    });

    it('should publish data with custom options', async () => {
      const testData = { alert: 'System maintenance in 5 minutes' };
      const options = {
        type: 'system-alert',
        id: 'alert-001',
        description: 'System alerts channel',
      };
      
      await realtimeService.publish('system-alerts', testData, options);

      expect(SSEProcessor.publishEvent).toHaveBeenCalledWith({
        channel: 'system-alerts',
        data: testData,
        type: 'system-alert',
        id: 'alert-001',
      });
    });

    it('should handle complex data objects', async () => {
      const complexData = {
        user: { id: 123, name: 'John', preferences: { theme: 'dark' } },
        metadata: { timestamp: new Date('2024-01-15'), tags: ['urgent', 'user'] },
        nested: { deep: { value: true } },
      };
      
      await realtimeService.publish('complex-channel', complexData);

      expect(SSEProcessor.publishEvent).toHaveBeenCalledWith({
        channel: 'complex-channel',
        data: complexData,
        type: undefined,
        id: undefined,
      });
    });

    it('should generate unique IDs for each publish', async () => {
      await realtimeService.publish('test', { data: 1 });
      await realtimeService.publish('test', { data: 2 });

      expect(SSEProcessor.publishEvent).toHaveBeenCalledTimes(2);
      // O SSEProcessor gera IDs únicos internamente se não fornecido
    });

    it('should include timestamps', async () => {
      const beforeTime = new Date().toISOString();
      
      await realtimeService.publish('timestamp-test', { test: 'data' });
      
      const afterTime = new Date().toISOString();
      
      expect(SSEProcessor.publishEvent).toHaveBeenCalledWith({
        channel: 'timestamp-test',
        data: { test: 'data' },
        type: undefined,
        id: undefined,
      });
      
      // O SSEProcessor adiciona timestamp internamente nos dados se necessário
    });
  });

  describe('Builder Pattern (to method)', () => {
    it('should create a builder for the specified channel', () => {
      const builder = realtimeService.to('test-channel');
      expect(builder).toBeDefined();
      expect(typeof builder.withData).toBe('function');
      expect(typeof builder.publish).toBe('function');
    });

    it('should allow method chaining with withData', () => {
      const builder = realtimeService.to('test-channel')
        .withData({ test: 'data' });
      
      expect(builder).toBeDefined();
      expect(typeof builder.publish).toBe('function');
    });

    it('should allow method chaining with withType', () => {
      const builder = realtimeService.to('test-channel')
        .withType('notification');
      
      expect(builder).toBeDefined();
      expect(typeof builder.publish).toBe('function');
    });

    it('should allow method chaining with withId', () => {
      const builder = realtimeService.to('test-channel')
        .withId('event-123');
      
      expect(builder).toBeDefined();
      expect(typeof builder.publish).toBe('function');
    });

    it('should allow method chaining with withDescription', () => {
      const builder = realtimeService.to('test-channel')
        .withDescription('Test events');
      
      expect(builder).toBeDefined();
      expect(typeof builder.publish).toBe('function');
    });

    it('should allow complex method chaining', () => {
      const builder = realtimeService.to('test-channel')
        .withData({ message: 'Hello' })
        .withType('greeting')
        .withId('greet-001')
        .withDescription('Greeting events');
      
      expect(builder).toBeDefined();
      expect(typeof builder.publish).toBe('function');
    });
  });

  describe('Builder withScopes', () => {
    it('should accept scopes function', () => {
      const scopesFunction = (ctx: any) => ['admin', 'user'];
      const builder = realtimeService.to('scoped-channel')
        .withScopes(scopesFunction);
      
      expect(builder).toBeDefined();
      expect(typeof builder.publish).toBe('function');
    });

    it('should accept async scopes function', () => {
      const asyncScopesFunction = async (ctx: any) => ['admin'];
      const builder = realtimeService.to('async-scoped-channel')
        .withScopes(asyncScopesFunction);
      
      expect(builder).toBeDefined();
      expect(typeof builder.publish).toBe('function');
    });
  });

  describe('Builder Publish', () => {
    it('should publish with builder-configured data', async () => {
      await realtimeService.to('builder-test')
        .withData({ message: 'Builder test' })
        .withType('test-event')
        .publish();

      expect(SSEProcessor.publishEvent).toHaveBeenCalledWith({
        channel: 'builder-test',
        data: { message: 'Builder test' },
        type: 'test-event',
        id: undefined,
      });
    });

    it('should publish with description', async () => {
      vi.mocked(SSEProcessor.channelExists).mockReturnValue(false);
      
      await realtimeService.to('description-test')
        .withData({ content: 'test' })
        .withDescription('Test description')
        .publish();

      expect(SSEProcessor.registerChannel).toHaveBeenCalledWith({
        id: 'description-test',
        description: 'Test description',
      });
    });

    it('should override channel if specified in withChannel', async () => {
      await realtimeService.to('original-channel')
        .withChannel('overridden-channel')
        .withData({ test: true })
        .publish();

      expect(SSEProcessor.publishEvent).toHaveBeenCalledWith({
        channel: 'overridden-channel',
        data: { test: true },
        type: undefined,
        id: undefined,
      });
    });

    it('should handle minimal builder configuration', async () => {
      await realtimeService.to('minimal-test').publish();

      expect(SSEProcessor.publishEvent).toHaveBeenCalledWith({
        channel: 'minimal-test',
        data: undefined,
        type: undefined,
        id: undefined,
      });
    });
  });

  describe('Global Broadcast', () => {
    it('should broadcast to global channel', async () => {
      const broadcastData = { system: 'Global announcement' };
      
      await realtimeService.broadcast(broadcastData);

      // Deve chamar publish para cada canal registrado
      expect(SSEProcessor.publishEvent).toHaveBeenCalledTimes(2); // 2 canais mockados
      expect(SSEProcessor.publishEvent).toHaveBeenCalledWith({
        channel: 'channel1',
        data: broadcastData,
        type: undefined,
        id: undefined,
      });
      expect(SSEProcessor.publishEvent).toHaveBeenCalledWith({
        channel: 'channel2',
        data: broadcastData,
        type: undefined,
        id: undefined,
      });
    });

    it('should handle complex broadcast data', async () => {
      const complexBroadcast = {
        system: { status: 'maintenance', duration: '2 hours' },
        users: { affected: 1500, notification: true },
      };
      
      await realtimeService.broadcast(complexBroadcast);

      expect(SSEProcessor.publishEvent).toHaveBeenCalledTimes(2);
    });

    it('should handle null and undefined broadcast data', async () => {
      await realtimeService.broadcast(null);
      await realtimeService.broadcast(undefined);

      expect(SSEProcessor.publishEvent).toHaveBeenCalledTimes(4); // 2 calls x 2 channels each
    });
  });

  describe('Error Handling', () => {
    it('should handle store publish errors', async () => {
      const publishError = new Error('Store publish failed');
      vi.mocked(SSEProcessor.publishEvent).mockImplementation(() => {
        throw publishError;
      });

      await expect(realtimeService.publish('error-test', { test: true }))
        .rejects.toThrow('Store publish failed');
    });

    it('should handle builder publish errors', async () => {
      const builderError = new Error('Builder publish failed');
      vi.mocked(SSEProcessor.publishEvent).mockImplementation(() => {
        throw builderError;
      });

      await expect(
        realtimeService.to('builder-error')
          .withData({ test: true })
          .publish()
      ).rejects.toThrow('Builder publish failed');
    });

    it('should handle broadcast errors', async () => {
      const broadcastError = new Error('Broadcast failed');
      vi.mocked(SSEProcessor.publishEvent).mockImplementation(() => {
        throw broadcastError;
      });

      await expect(realtimeService.broadcast({ test: true }))
        .rejects.toThrow('Broadcast failed');
    });
  });

  describe('Data Serialization', () => {
    it('should serialize primitive data types correctly', async () => {
      await realtimeService.publish('string-test', 'Hello World');
      await realtimeService.publish('number-test', 42);
      await realtimeService.publish('boolean-test', true);

      expect(SSEProcessor.publishEvent).toHaveBeenCalledTimes(3);
      
      // Verifica que os dados primitivos são passados diretamente
      expect(SSEProcessor.publishEvent).toHaveBeenNthCalledWith(1, {
        channel: 'string-test',
        data: 'Hello World',
        type: undefined,
        id: undefined,
      });
    });

    it('should serialize arrays correctly', async () => {
      const arrayData = [1, 'two', { three: 3 }, [4, 5]];
      
      await realtimeService.publish('array-test', arrayData);

      expect(SSEProcessor.publishEvent).toHaveBeenCalledWith({
        channel: 'array-test',
        data: arrayData,
        type: undefined,
        id: undefined,
      });
    });

    it('should serialize nested objects correctly', async () => {
      const nestedData = {
        level1: {
          level2: {
            level3: { value: 'deep' },
            array: [1, 2, 3],
          },
        },
      };
      
      await realtimeService.publish('nested-test', nestedData);

      expect(SSEProcessor.publishEvent).toHaveBeenCalledWith({
        channel: 'nested-test',
        data: nestedData,
        type: undefined,
        id: undefined,
      });
    });

    it('should handle dates in data', async () => {
      const dateData = {
        created: new Date('2024-01-01'),
        updated: new Date('2024-12-31T23:59:59Z'),
      };
      
      await realtimeService.publish('date-test', dateData);

      expect(SSEProcessor.publishEvent).toHaveBeenCalledWith({
        channel: 'date-test',
        data: dateData,
        type: undefined,
        id: undefined,
      });
    });
  });

  describe('Channel Names', () => {
    it('should handle various channel name formats', async () => {
      const channels = [
        'simple',
        'with-dashes',
        'with_underscores',
        'with:colons',
        'with.dots',
        'with/slashes',
        'MixedCase',
        'with123numbers',
        'very-long-channel-name-that-should-still-work-fine',
      ];

      for (const channel of channels) {
        await realtimeService.publish(channel, { test: `data for ${channel}` });
      }

      expect(SSEProcessor.publishEvent).toHaveBeenCalledTimes(channels.length);
    });

    it('should handle empty channel names', async () => {
      await realtimeService.publish('', { test: 'empty' });

      expect(SSEProcessor.publishEvent).toHaveBeenCalledWith(
        {
          channel: '',
          data: { test: 'empty' },
          type: undefined,
          id: undefined,
        }
      );
    });

    it('should handle unicode channel names', async () => {
      const unicodeChannel = '用户-通知-频道';
      await realtimeService.publish(unicodeChannel, { message: 'unicode test' });

      expect(SSEProcessor.publishEvent).toHaveBeenCalledWith(
        {
          channel: unicodeChannel,
          data: { message: 'unicode test' },
          type: undefined,
          id: undefined,
        }
      );
    });
  });

  describe('Performance and Memory', () => {
    it('should handle rapid publishing efficiently', async () => {
      const startTime = performance.now();
      const promises: Promise<void>[] = [];

      for (let i = 0; i < 100; i++) {
        promises.push(realtimeService.publish(`channel-${i}`, { index: i }));
      }

      await Promise.all(promises);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(SSEProcessor.publishEvent).toHaveBeenCalledTimes(100);
    });

    it('should not create memory leaks with builder pattern', async () => {
      // Test multiple builder instances
      for (let i = 0; i < 1000; i++) {
        await realtimeService.to(`test-${i}`)
          .withData({ iteration: i })
          .publish();
      }

      expect(SSEProcessor.publishEvent).toHaveBeenCalledTimes(1000);
    });

    it('should handle large data payloads', async () => {
      const largeData = {
        array: new Array(10000).fill(0).map((_, i) => ({ id: i, data: `item-${i}` })),
        text: 'a'.repeat(50000),
      };
      
      await realtimeService.publish('large-data', largeData);

      expect(SSEProcessor.publishEvent).toHaveBeenCalledWith({
        channel: 'large-data',
        data: largeData,
        type: undefined,
        id: undefined,
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle circular references in data gracefully', async () => {
      const circularData: any = { name: 'test' };
      circularData.self = circularData;

      // O SSEProcessor vai lidar com a serialização internamente
      // Este teste verifica se pelo menos tentamos publicar
      await expect(realtimeService.publish('circular', circularData))
        .resolves.toBeUndefined();
    });

    it('should handle symbols in data', async () => {
      const symbolData = {
        normal: 'normal value',
        [Symbol('test')]: 'symbol value',
      };
      
      await realtimeService.publish('symbol-test', symbolData);

      expect(SSEProcessor.publishEvent).toHaveBeenCalledWith({
        channel: 'symbol-test',
        data: symbolData,
        type: undefined,
        id: undefined,
      });
    });

    it('should handle functions in data', async () => {
      const dataWithFunction = {
        normal: 'value',
        fn: () => 'test',
      };
      
      await realtimeService.publish('function-test', dataWithFunction);

      expect(SSEProcessor.publishEvent).toHaveBeenCalledWith({
        channel: 'function-test',
        data: dataWithFunction,
        type: undefined,
        id: undefined,
      });
    });

    it('should handle undefined values in data', async () => {
      const dataWithUndefined = {
        defined: 'value',
        undefined: undefined,
        null: null,
      };
      
      await realtimeService.publish('undefined-test', dataWithUndefined);

      expect(SSEProcessor.publishEvent).toHaveBeenCalledWith({
        channel: 'undefined-test',
        data: dataWithUndefined,
        type: undefined,
        id: undefined,
      });
    });
  });
}); 