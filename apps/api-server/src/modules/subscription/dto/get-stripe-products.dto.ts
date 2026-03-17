// biome-ignore-all lint/style/noInferrableTypes: explicit types for API clarity
export class GetStripeProductsDto {
  ending_before?: string;

  starting_after?: string;

  limit?: number = 10;

  active?: boolean = true;
}
