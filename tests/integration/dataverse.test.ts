import { describe, it, expect } from 'vitest';

describe('Dataverse Integration Tests', () => {
  it('should fetch systemusers', async () => {
    const response = await fetch('/api/data/v9.1/systemusers?$select=fullname&$top=5');
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data.value).toBeDefined();
    expect(Array.isArray(data.value)).toBe(true);
  });
});