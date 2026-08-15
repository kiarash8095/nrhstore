interface ProductPageProps {
    params: Promise<{
        slug: string;
    }>
}


export default async function ProductPage({params}: ProductPageProps)
{
    const {slug} = await params
    console.log(slug)
    return(<div>
        <p>product</p>
    </div>)
}