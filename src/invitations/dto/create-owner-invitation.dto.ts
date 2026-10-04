import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateOwnerInvitationDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  ownerName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  tenantName!: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(63)
  tenantSlug!: string;
}
