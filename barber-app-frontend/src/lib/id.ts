export type WithMaybeId = { id?: string; _id?: string };

export const getId = (item?: WithMaybeId | null): string => item?.id ?? item?._id ?? "";

export const normalizeId = <T extends WithMaybeId>(item: T) => ({
  ...item,
  id: item.id ?? item._id,
  _id: item._id ?? item.id,
});
