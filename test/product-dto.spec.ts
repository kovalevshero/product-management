import { describe, it, expect } from '@jest/globals';
import { validate } from 'class-validator';
import { CreateProductDto } from '../src/modules/products/dto/create-product.dto';
import { UpdateProductDto } from '../src/modules/products/dto/update-product.dto.js';
import { plainToInstance } from 'class-transformer';

describe('CreateProductDto', () => {
  it('rejects explicit null updates to required fields', async () => {
    for (const property of ['title', 'price', 'category', 'images']) {
      expect((await validate(plainToInstance(UpdateProductDto, { [property]: null }))).map(e => e.property)).toContain(property);
    }
  });
  it('rejects whitespace-only labels and non-scalar prices at the HTTP conversion boundary', async () => {
    for (const changes of [{ title: ' ' }, { category: ' ' }, { price: true }, { price: [5] }]) {
      const dto = plainToInstance(CreateProductDto, { title: 'Demo', category: 'Demo', price: 99.99, images: ['https://example.com/demo.jpg'], ...changes });
      expect((await validate(dto)).length).toBeGreaterThan(0);
    }
  });
  it('rejects precision loss and non-HTTP images', async () => {
    const dto = Object.assign(new CreateProductDto(), {
      title: 'Demo product', price: 1.001, category: 'Clothes', images: ['javascript:alert(1)'],
    });
    const errors = await validate(dto);
    expect(errors.map(e => e.property)).toEqual(expect.arrayContaining(['price', 'images']));
  });
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
