"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useBrands, useCreateBrand } from "@/hooks/use-brands";
import { useCategories, useCreateCategory } from "@/hooks/use-categories";
import { useCreateProduct, useUpdateProduct } from "@/hooks/use-products";
import { Plus } from "lucide-react";

interface ProductFormValues {
  name:        string;
  sku:         string;
  barcode:     string;
  brandId:     string;
  categoryId:  string;
  productType: string;
  unit:        string;
  description: string;
}

interface ProductFormProps {
  open:       boolean;
  onClose:    () => void;
  product?:   Record<string, any> | null;
}

export function ProductForm({ open, onClose, product }: ProductFormProps) {
  const isEdit = !!product;
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ProductFormValues>();

  const { data: brands = [] }     = useBrands();
  const { data: categories = [] } = useCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const createBrand   = useCreateBrand();
  const createCategory = useCreateCategory();

  const [newBrandName, setNewBrandName]       = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewBrand, setShowNewBrand]       = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);

  useEffect(() => {
    if (product) {
      reset({
        name:        product.name         ?? "",
        sku:         product.sku          ?? "",
        barcode:     product.barcode      ?? "",
        brandId:     product.brandId      ?? "",
        categoryId:  product.categoryId   ?? "",
        productType: product.productType  ?? "BOTH",
        unit:        product.unit         ?? "each",
        description: product.description  ?? "",
      });
    } else {
      reset({ name: "", sku: "", barcode: "", brandId: "", categoryId: "", productType: "BOTH", unit: "each", description: "" });
    }
  }, [product, reset]);

  async function onSubmit(values: ProductFormValues) {
    const payload = {
      ...values,
      sku:         values.sku       || null,
      barcode:     values.barcode   || null,
      brandId:     values.brandId   || null,
      categoryId:  values.categoryId || null,
      description: values.description || null,
    };

    if (isEdit) {
      await updateProduct.mutateAsync({ id: product.id, ...payload });
    } else {
      await createProduct.mutateAsync(payload);
    }
    onClose();
  }

  async function handleAddBrand() {
    if (!newBrandName.trim()) return;
    const brand = await createBrand.mutateAsync(newBrandName.trim());
    setValue("brandId", brand.id);
    setNewBrandName("");
    setShowNewBrand(false);
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    const cat = await createCategory.mutateAsync(newCategoryName.trim());
    setValue("categoryId", cat.id);
    setNewCategoryName("");
    setShowNewCategory(false);
  }

  const isPending = createProduct.isPending || updateProduct.isPending;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Product" : "Add Product"}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-1">
            <Label htmlFor="name">Product Name <span className="text-destructive">*</span></Label>
            <Input id="name" {...register("name", { required: "Name is required" })} placeholder="e.g. Nuskinn Body Wax" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          {/* SKU / Barcode */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" {...register("sku")} placeholder="PD123" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="barcode">Barcode</Label>
              <Input id="barcode" {...register("barcode")} placeholder="8809..." />
            </div>
          </div>

          <Separator />

          {/* Brand */}
          <div className="space-y-1">
            <Label>Brand</Label>
            <div className="flex gap-2">
              <Select value={watch("brandId")} onValueChange={(v) => setValue("brandId", v)}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— None —</SelectItem>
                  {brands.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="icon" onClick={() => setShowNewBrand((v) => !v)}>
                <Plus className="size-4" />
              </Button>
            </div>
            {showNewBrand && (
              <div className="flex gap-2 mt-1">
                <Input placeholder="New brand name" value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)} />
                <Button type="button" size="sm" onClick={handleAddBrand} disabled={createBrand.isPending}>Add</Button>
              </div>
            )}
          </div>

          {/* Category */}
          <div className="space-y-1">
            <Label>Category</Label>
            <div className="flex gap-2">
              <Select value={watch("categoryId")} onValueChange={(v) => setValue("categoryId", v)}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— None —</SelectItem>
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="icon" onClick={() => setShowNewCategory((v) => !v)}>
                <Plus className="size-4" />
              </Button>
            </div>
            {showNewCategory && (
              <div className="flex gap-2 mt-1">
                <Input placeholder="New category name" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                <Button type="button" size="sm" onClick={handleAddCategory} disabled={createCategory.isPending}>Add</Button>
              </div>
            )}
          </div>

          <Separator />

          {/* Type & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={watch("productType")} onValueChange={(v) => setValue("productType", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                  <SelectItem value="RETAIL">Retail</SelectItem>
                  <SelectItem value="BOTH">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="unit">Unit</Label>
              <Input id="unit" {...register("unit")} placeholder="each" />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} placeholder="Optional notes..." rows={3} />
          </div>

          <SheetFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : isEdit ? "Save Changes" : "Add Product"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
