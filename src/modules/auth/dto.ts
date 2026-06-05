import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsNotEmpty()
  organizationName!: string;

  @IsString()
  @IsNotEmpty()
  industry!: string;

  @IsString()
  @IsOptional()
  currency?: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class OnboardingAnswerDto {
  @IsString()
  @IsNotEmpty()
  questionKey!: string;

  @IsString()
  @IsNotEmpty()
  answer!: string;
}

export class InviteMemberDto {
  @IsEmail()
  email!: string;

  @IsIn(['owner', 'accountant', 'viewer'])
  role!: string;
}

export class AcceptInvitationDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}
