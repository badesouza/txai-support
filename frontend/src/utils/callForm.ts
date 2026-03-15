export interface CallFormValues {
  title: string;
  description: string;
  status: string;
  priority: string;
}

export function buildCallFormData(
  values: CallFormValues,
  images: File[],
  extraEntries: Record<string, string> = {}
): FormData {
  const formData = new FormData();

  Object.entries(values).forEach(([key, value]) => {
    formData.append(key, value);
  });

  images.forEach((image) => {
    formData.append('images', image);
  });

  Object.entries(extraEntries).forEach(([key, value]) => {
    formData.append(key, value);
  });

  return formData;
}
