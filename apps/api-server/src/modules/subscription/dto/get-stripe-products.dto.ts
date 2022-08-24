/* eslint-disable max-classes-per-file */
/* eslint-disable @typescript-eslint/no-inferrable-types */
export class GetStripeProductsDto {
  ending_before?: string;

  starting_after?: string;

  limit?: number = 10;

  active?: boolean = true;
}
