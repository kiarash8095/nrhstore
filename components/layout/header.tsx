"use client";

import styles from "./header.module.css";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";
import { RxHamburgerMenu } from "react-icons/rx";
import { IoIosArrowBack } from "react-icons/io";
import { IoClose } from "react-icons/io5";


import Image from "next/image";
import userRound from "@/public/user-round.svg";
import handBag from "@/public/handbag.svg";
import desktopLogo from "@/public/nrh-header-desktop.png";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CategoryIcons } from "@/constants/categories-icons";
import React, { useState } from "react";
import { getSearchResult } from "@/services/searchInputHeader";
import { useDebounce } from "@/hooks/useDebounce";
import { Category } from "@/types/category";
import { SearchResult } from "@/types/search-result";
import { getAllCategories, getSubCategories } from "@/services/categories";

interface HeaderProps {
    categories: Category[]
}

export default function Header({categories}:HeaderProps) {
  const [input, setInput] = useState("");
  const [isInput, setIsInput] = useState(false)
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null)

  const debouncedInput = useDebounce(input, 500);

  const queryClient = useQueryClient()

  const inputHandler = (e:React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value)

        setIsInput(true)
  }

  const closeHandler = () => setIsInput(false)
  
//   console.log(categories)

  

    const handleMouseEnter = (category:Category) => {

        setActiveCategory(category)
            queryClient.prefetchQuery({
                queryKey: ['sub-categories', category?.id],
                queryFn: () => getSubCategories(category.id),
                staleTime: 1000 * 60 * 10,
            })
    }
    
    const {data:subCategoryData} = useQuery({
        queryKey: ["sub-categories", activeCategory?.id],
        queryFn: () => getSubCategories(activeCategory!.id),
        enabled: !!activeCategory,
    })


  const { data: searchData = [] } = useQuery<SearchResult[]>({
    queryKey: ["get-search-result", debouncedInput],
    queryFn: () => getSearchResult(debouncedInput),
    enabled: debouncedInput.trim().length > 0,
    staleTime: 60 * 1000,
  });
//   console.log(searchData);

  const {data:allCategories} = useQuery({
    queryKey: ['categories'],
    queryFn: getAllCategories,
  })
  console.log(allCategories);
//   console.log(activeCategory)

//   console.log(searchData);

//   console.log(categories);
  return (
    <>
      <header className="flex justify-center gap-15 align-center mt-5 h-auto ">
        <div
          className="relative w-42 h-auto md:w-48 md:h-auto
         p-2 -translate-y-2"
        >
            <Link href="/">
          <Image
            src={desktopLogo}
            alt="لوگوی سایت"
            loading="eager"
            className="object-contain"
          />
            </Link>
        </div>

        <div className="relative w-md max-w-md">
          <Input
            type="text"
            value={input}
            onChange={inputHandler}
            placeholder="دنبال چی میگردی؟"
            className="height-11 rounded-full p-6 bg-gray-100 text-sm
            shadow-md"
          />
          {isInput && <IoClose onClick={closeHandler} className="absolute left-13 top-4 cursor-pointer"/>}
          <div className={`absolute w-30 h-40 scrollbar-none overflow-y-auto scroll-fade
           transition duration-300 ${isInput ? "visible opacity-100 translate-y-0":
            "invisible opacity-0 translate-y-4"
          }`}>
            {searchData?.map(item => <div key={item.id}>{item.name}</div>)}
          </div>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="w-12 h-12 m-[1px] absolute left-0 bg-gray-200 rounded-full cursor-pointer
            hover:bg-orange-500 transition-all delay-10"
          >
            <SearchIcon className="h-5 w-5" />
          </Button>
        </div>

        <div className="relative flex justify-between gap-5">
          <div
            className="w-13 h-13 border-1 border-gray rounded-full p-2 backdrop-blur-md
          hover:border-orange-500 hover:animate-pulse transition delay-100 shadow-md"
          >
            <a href="#">
              <Image className="w-9 h-9" src={userRound} alt="لوگوی سایت" />
              {/* <p>ورود به حساب کاربری</p> */}
            </a>
          </div>

          <div
            className="w-13 h-13 border-1 border-gray rounded-full
           justify-center align-center p-2 hover:border-orange-500 transition delay-100
            shadow-md"
          >
            <a href="#">
              <div>
                <div className="relative">
                  <p className="absolute  w-3 h-3 rounded-full bg-[#000]"></p>
                  <Image
                    className="w-9 h-9"
                    src={handBag}
                    alt="لوگوی سبد خرید"
                  />
                </div>
              </div>
            </a>
          </div>
        </div>
      </header>

      <nav className="flex mt-5">
        <div className="">
          <div
            className="relative"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
          >
            <button
              className="flex w-50 px-4 py-2 items-center justify-center p-2 
              mr-5 bg-orange-500 rounded-3xl text-white text-center cursor-pointer"
            >
              <RxHamburgerMenu size={20} className="ml-3" />
              <span>دسته بندی ها</span>
              <IoIosArrowBack className="mr-2" />
            </button>

            <div className="">
              <div 
                className={`absolute flex top-full right-5 pt-4 transition duration-300
                ${
                  isOpen
                    ? "visible opacity-100 pt-5 -translate-x-4"
                    : "invisible opacity-0 translate-y-4 translate-x-4"
                }`}
              >
                <div className="w-56 rounded-r-xl bg-white shadow-lg">
                  {categories?.map((category) => {
                    const Icon = CategoryIcons[category.slug];

                    return (
                      <div onMouseEnter={() => handleMouseEnter(category)}
                        key={category.id}
                        className="mb-4 p-2 w-50 justify-center bg-gray-200 rounded-md
                                 -translate-y-2 transition-all duration-300"
                      >
                        <button className="flex cursor-pointer">
                          <div className="flex">
                            {Icon && <Icon />}
                            <span>{category.name}</span>
                          </div>
                          <IoIosArrowBack className="mr-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* ستون دوم */}
                <div className="w-72 bg-white shadow-lg p-4 border-r">
                    <Link href={`/products?category=${activeCategory?.id}`}>مشاهده همه {activeCategory?.name}</Link>
                    {subCategoryData?.map(category => <div key={category.id}>{category.name}</div>)}
                </div>

                {/* ستون سوم */}
                <div className="w-64 bg-white shadow-lg p-4 border-r">
                  Banner یا محصولات پیشنهادی
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
