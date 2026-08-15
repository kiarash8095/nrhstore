import banner1 from '@/public/11-1.webp'
import banner2 from '@/public/22-1.webp'
import banner3 from '@/public/33-1.webp'
import Image from 'next/image'


export function BannersRow()
{
    return(<div className='flex gap-4 justify-center my-10'>
        <div className='transition duration-250 cursor-pointer hover:-translate-y-3'>
            <Image src={banner1} alt='عکس بنر اول'/>
        </div>
        <div className='transition duration-250 cursor-pointer hover:-translate-y-3'>
            <Image src={banner2} alt='عکس بنر دوم'/>

        </div>
        <div className='transition duration-250 cursor-pointer hover:-translate-y-3'>

            <Image src={banner3} alt='عکس بنر سوم'/>
        </div>
    </div>)
}