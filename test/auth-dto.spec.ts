import { validate } from 'class-validator';
import { RegisterDto } from '../src/modules/auth/dto/register.dto';

describe('RegisterDto', () => {
  it('should fail when password and password_confirmation do not match', async () => {
    const dto = new RegisterDto();
    dto.username = 'john_doe';
    dto.password = 'supersecret';
    dto.password_confirmation = 'differentsecret';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'password_confirmation')).toBe(true);
  });

  it('should pass when password and password_confirmation match', async () => {
    const dto = new RegisterDto();
    dto.username = 'john_doe';
    dto.password = 'supersecret';
    dto.password_confirmation = 'supersecret';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
