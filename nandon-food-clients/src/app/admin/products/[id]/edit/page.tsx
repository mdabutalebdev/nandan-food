"use client";

import { useEffect, useState } from "react";
import { PackageX } from "lucide-react";
import { useParams } from "next/navigation";
import ProductForm from "@/components/admin/ProductForm";
import { adminGetProduct } from "@/lib/admin";
import type { Product } from "@/lib/types";
import { EmptyState, TableSkeleton } from "@/components/admin/ui";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    adminGetProduct(id).then((p) => {
      setProduct(p);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="rounded-xl border border-line bg-white"><TableSkeleton rows={8} cols={3} /></div>;
  if (!product) return <EmptyState Icon={PackageX} title="Product not found" desc="It may have been deleted." />;

  return <ProductForm product={product} />;
}
