import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MinLength, Matches, Validate } from 'class-validator';
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

@ValidatorConstraint({ name: 'MatchPassword', async: false })
export class MatchPasswordConstraint implements ValidatorConstraintInterface {
  validate(propertyValue: string, args: ValidationArguments) {
    return propertyValue === (args.object as any)['password'];
  }
  defaultMessage() {
    return 'password_confirmation must match password';
  }
}

export class RegisterDto {
  @ApiProperty({ example: 'jhon_doe', description: 'Unique username' })
  @IsString()
  @IsNotEmpty({ message: 'username is required' })
  @MinLength(3, { message: 'username must be at least 3 characters' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'username can only contain alphanumeric characters and underscores' })
  username: string;

  @ApiProperty({ example: 'supersecret', description: 'User password (min 6 characters)' })
  @IsString()
  @IsNotEmpty({ message: 'password is required' })
  @MinLength(6, { message: 'password must be at least 6 characters' })
  password: string;

  @ApiProperty({ example: 'supersecret', description: 'Confirmation matching password' })
  @IsString()
  @IsNotEmpty({ message: 'password_confirmation is required' })
  @Validate(MatchPasswordConstraint)
  password_confirmation: string;

  @ApiPropertyOptional({ example: 'Jhon Doe', description: 'Optional user full name' })
  @IsOptional()
  @IsString()
  full_name?: string;
}
