export class GetStripeProductsDto {
  ending_before?: string;

  starting_after?: string;

  limit?: number = 10;

  active?: boolean = true;
}
