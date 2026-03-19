export class GetStripePricesDto {
  ending_before?: string;

  starting_after?: string;

  limit?: number = 10;

  active?: boolean = true;

  product?: string;

  currency?: string;

  lookup_keys?: string[];
}
