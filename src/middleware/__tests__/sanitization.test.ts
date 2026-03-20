import { Request, Response } from 'express';
import { sanitizeInput, addCorrelationId, enforceContentType } from '../sanitization.middleware';

describe('Sanitization Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      method: 'POST',
      path: '/api/test',
      ip: '127.0.0.1',
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('addCorrelationId', () => {
    it('should add correlation ID to request', () => {
      addCorrelationId(mockReq as any, mockRes as Response, mockNext);

      expect(mockReq.correlationId).toBeDefined();
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-Correlation-ID',
        mockReq.correlationId
      );
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('enforceContentType', () => {
    it('should allow GET requests without Content-Type', () => {
      mockReq.method = 'GET';

      enforceContentType(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should allow health check without Content-Type', () => {
      mockReq.path = '/health';

      enforceContentType(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject POST without Content-Type', () => {
      mockReq.headers = {};

      enforceContentType(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(415);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'UNSUPPORTED_MEDIA_TYPE',
          }),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow application/json Content-Type', () => {
      mockReq.headers = { 'content-type': 'application/json' };

      enforceContentType(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('sanitizeInput', () => {
    it('should trim string values', async () => {
      mockReq.body = {
        name: '  John Doe  ',
        email: '  test@example.com  ',
      };

      await sanitizeInput(mockReq as any, mockRes as Response, mockNext);

      expect(mockReq.body.name).toBe('John Doe');
      expect(mockReq.body.email).toBe('test@example.com');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should remove __proto__ property', async () => {
      mockReq.body = {
        name: 'John',
        __proto__: { admin: true },
      };

      await sanitizeInput(mockReq as any, mockRes as Response, mockNext);

      expect(mockReq.body.__proto__).toBeUndefined();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should remove constructor property', async () => {
      mockReq.body = {
        name: 'John',
        constructor: { admin: true },
      };

      await sanitizeInput(mockReq as any, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should remove $where operator', async () => {
      mockReq.body = {
        query: {
          $where: 'this.password == "admin"',
        },
      };

      await sanitizeInput(mockReq as any, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should reject deeply nested objects', async () => {
      mockReq.body = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  level6: {
                    data: 'too deep',
                  },
                },
              },
            },
          },
        },
      };

      await sanitizeInput(mockReq as any, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'INVALID_INPUT',
          }),
        })
      );
    });

    it('should truncate overly long strings', async () => {
      const longString = 'a'.repeat(15000);
      mockReq.body = {
        description: longString,
      };

      await sanitizeInput(mockReq as any, mockRes as Response, mockNext);

      expect(mockReq.body.description.length).toBe(10000);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should sanitize nested arrays', async () => {
      mockReq.body = {
        items: [
          { name: '  Item 1  ' },
          { name: '  Item 2  ' },
        ],
      };

      await sanitizeInput(mockReq as any, mockRes as Response, mockNext);

      expect(mockReq.body.items[0].name).toBe('Item 1');
      expect(mockReq.body.items[1].name).toBe('Item 2');
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
