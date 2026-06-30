"use server";

import { uploadFile } from "@/actions/storage-action";
import { createClient } from "@/lib/supabase/server";
import { MenuFormState } from "@/types/menu";
import { menuSchema } from "@/validations/menu-validation";

export async function createMenu(prevState: MenuFormState, formData: FormData) {
  let validatedFields = menuSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    price: parseFloat(formData.get("price") as string),
    discount: parseFloat(formData.get("discount") as string),
    category: formData.get("category"),
    image_url: formData.get("image_url"),
    is_available: formData.get("is_available") === "true" ? true : false,
  });

  if (!validatedFields.success) {
    return {
      status: "error",
      errors: {
        ...validatedFields.error.flatten().fieldErrors,
        _form: [],
      },
    };
  }

  if (validatedFields.data.image_url instanceof File) {
    const { errors, data } = await uploadFile(
      "images",
      "menus",
      validatedFields.data.image_url,
    );
    if (errors) {
      return {
        status: "error",
        errors: {
          ...prevState.errors,
          _form: [...errors._form],
        },
      };
    }

    validatedFields = {
      ...validatedFields,
      data: {
        ...validatedFields.data,
        image_url: data.url,
      },
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("menus").insert({
    name: validatedFields.data.name,
    description: validatedFields.data.description,
    price: validatedFields.data.price,
    discount: validatedFields.data.discount,
    category: validatedFields.data.category,
    image_url: validatedFields.data.image_url,
    is_available: validatedFields.data.is_available,
  });

  if (error) {
    return {
      status: "error",
      errors: {
        ...prevState.errors,
        _form: [error.message],
      },
    };
  }

  return {
    status: "success",
  };
}
