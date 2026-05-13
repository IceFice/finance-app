import { describe, it, expect } from 'vitest';
import {
  AppError, ValidationError, NotFoundError,
  UnauthorizedError, ForbiddenError, ConflictError, DomainError,
} from '../errors';

describe('AppError hierarchy', () => {
  it('AppError has correct statusCode, code, and message', () => {
    const err = new AppError(418, 'IM_A_TEAPOT', 'Short and stout');
    expect(err.statusCode).toBe(418);
    expect(err.code).toBe('IM_A_TEAPOT');
    expect(err.message).toBe('Short and stout');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it('AppError stores details payload', () => {
    const details = [{ field: 'email', message: 'required' }];
    const err = new AppError(422, 'VALIDATION_ERROR', 'Bad input', details);
    expect(err.details).toEqual(details);
  });

  describe('ValidationError', () => {
    it('has status 422 and code VALIDATION_ERROR', () => {
      const err = new ValidationError('Invalid email');
      expect(err.statusCode).toBe(422);
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err).toBeInstanceOf(AppError);
    });
  });

  describe('NotFoundError', () => {
    it('defaults to "Resource not found"', () => {
      const err = new NotFoundError();
      expect(err.statusCode).toBe(404);
      expect(err.message).toBe('Resource not found');
    });

    it('includes resource name in message', () => {
      const err = new NotFoundError('Transaction');
      expect(err.message).toBe('Transaction not found');
    });
  });

  describe('UnauthorizedError', () => {
    it('has status 401', () => {
      const err = new UnauthorizedError();
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('UNAUTHORIZED');
    });
  });

  describe('ForbiddenError', () => {
    it('has status 403', () => {
      const err = new ForbiddenError();
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('FORBIDDEN');
    });
  });

  describe('ConflictError', () => {
    it('has status 409', () => {
      const err = new ConflictError('Email already registered');
      expect(err.statusCode).toBe(409);
      expect(err.code).toBe('CONFLICT');
    });
  });

  describe('DomainError', () => {
    it('has status 400', () => {
      const err = new DomainError('Cannot transfer to same account');
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('DOMAIN_ERROR');
    });
  });

  it('instanceof checks work across the hierarchy', () => {
    const err = new NotFoundError('User');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(NotFoundError);
    expect(err).not.toBeInstanceOf(ValidationError);
  });
});
