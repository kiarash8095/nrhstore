"use client"
import styles from './footer.module.css'
import Image from 'next/image';
import { TfiHeadphoneAlt } from "react-icons/tfi";
import footerLogo from '@/public/nrh-header-footer.png'
import { LiaTelegram } from "react-icons/lia";
import { FaInstagram } from "react-icons/fa";
import { FaCode } from "react-icons/fa";

import enamadLogo from '@/public/enamad_icon.png'
import Link from 'next/link';



export default function Footer()
{
    return <footer className='relative w-full bg-black text-white'>
        <div>
        <div className='flex flex-col'>
            <div className='flex items-center justify-center m-[15px_auto] p-5 bg-orange-500
             rounded-full w-xl gap-12'>
                <p>ما از ساعت 8:30 تا 13 و 16 الی 20 پاسخگوی شما هستیم.</p>
                <div className='flex items-center justify-center gap-1 cursor-pointer
                transition duration-300 hover:-translate-y-1'>

                <a>081-31775 |</a>
                <TfiHeadphoneAlt/>
                </div>
            </div>
            <div className='flex items-center justify-between p-3 flex-row gap-6'>
                <div className='flex flex-col gap-6'>
                    <Image src={footerLogo} className='w-3xs' alt='لوگوی فوتر'/>
                    <p>همدان-خیابان بوعلی-کوچه شریف-ساختمان نوین</p>
                    <div className='flex flex-row gap-7 p-4 bg-gray-500 w-fit rounded-xl'>
                        <a href="https://t.me/">

                            <LiaTelegram className='transition duration-300 cursor-pointer 
                            hover:text-blue-500 hover:-translate-y-1' size={25}/>
                        </a>
                        <a href="https://instagram.com/">

                            <FaInstagram className='transition duration-300 cursor-pointer 
                            hover:text-red-500 hover:-translate-y-1' size={25}/>
                        </a>
                    </div>
                </div>
                <div className='flex flex-row gap-5 '>
                    <div className='flex flex-col items-center'>
                        <h2>دسترسی سریع</h2>
                        <ul>
                            <li><Link href=""></Link></li>
                            <li><Link href=""></Link></li>
                            <li><Link href=""></Link></li>
                            <li><Link href=""></Link></li>
                        </ul>
                    </div>
                    <div className='flex flex-col items-center'>
                        <h2>محبوب ها</h2>
                        <ul>
                            <li><Link href=""></Link></li>
                            <li><Link href=""></Link></li>
                            <li><Link href=""></Link></li>
                            <li><Link href=""></Link></li>
                        </ul>
                    </div>
                    <div></div>
                </div>
                <div className='flex'>
                    <Image src={enamadLogo}
                     width={100} alt='' height={100}/>
                    <Image src={enamadLogo}
                     width={100} alt='' height={100}/>
                </div>
            </div>

            <hr />
            <div className='flex justify-between p-5 justify-between w-full'>
                <p>تمامی حقوق برای شرکت نوین رایانه همدان محفوظ است.</p>
                <div className='flex items-center gap-2'>
                    <FaCode width={20}/>
                <p>پیاده سازی توسط  </p>
                <p>کیارش افروغ</p>
                </div>
            </div>
        </div>
        </div>
    </footer>
}