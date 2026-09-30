import { describe, it, expect } from '@jest/globals';
import { validate } from 'class-validator';
import { CreateProductDto } from '../src/modules/products/dto/create-product.dto';

describe('CreateProductDto', () => {
  it('should fail when images array is empty', async () => {
    const dto = new CreateProductDto();
    dto.title = 'T-Shirt';
    dto.price = 99.99;
    dto.category = 'Clothes';
    dto.images = [];

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'images')).toBe(true);
  });

  it('should pass with valid data', async () => {
    const dto = new CreateProductDto();
    dto.title = 'T-Shirt';
    dto.price = 99.99;
    dto.category = 'Clothes';
    dto.images = ['https://placeimg.com/640/480/any'];

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
