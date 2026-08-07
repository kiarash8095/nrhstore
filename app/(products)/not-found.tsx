export default function ProductNotFound() {
  return (
    <div className="text-center py-20">
      <h1 className="text-6xl font-bold text-gray-300">۴۰۴</h1>
      <p className="text-xl mt-4">محصول مورد نظر یافت نشد!</p>
      <a href="/products" className="text-orange-500 mt-4 block">
        بازگشت به لیست محصولات
      </a>
    </div>
  );
}