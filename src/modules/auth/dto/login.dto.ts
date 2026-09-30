import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'jhon_doe', description: 'Username' })
  @IsString()
  @IsNotEmpty({ message: 'username is required' })
  username: string;

  @ApiProperty({ example: 'supersecret', description: 'Password' })
  @IsString()
  @IsNotEmpty({ message: 'password is required' })
  password: string;
}
