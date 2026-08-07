"use client";

import styles from "./header.module.css";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchIcon} from "lucide-react";
import { RxHamburgerMenu } from "react-icons/rx";
import { IoIosArrowBack } from "react-icons/io";
import { IoClose } from "react-icons/io5";
import { IoGrid } from "react-icons/io5";

import Image from "next/image";
import userRound from "@/public/user-round.svg";
import handBag from "@/public/handbag.svg";
import desktopLogo from "@/public/nrh-header-desktop.png";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CategoryIcons } from "@/constants/categories-icons";
import React, { useMemo, useState } from "react";
import { getSearchResult } from "@/services/searchInputHeader";
import { useDebounce } from "@/hooks/useDebounce";
import { Category } from "@/types/category";
import { SearchResult } from "@/types/search-result";
import {
  getAllCategories,
  getSubCategories,
} from "@/services/categories";
import { sp } from "@/utils/numbers";
import { SkeletonAvatar } from "../skeleton/searchResultSkeleton";

interface HeaderProps {
  categories: Category[];
}

export default function Header({ categories }: HeaderProps) {
  const [input, setInput] = useState("");
  const [isInput, setIsInput] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isClicked, setIsClicked] = useState(false)
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);

  const debouncedInput = useDebounce(input, 500);

  //   const queryClient = useQueryClient();

  const inputHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);

    // setIsInput(true);
  };

  const closeHandler = () => setIsInput(false);
  const focusHandler = () => setIsInput(true);
  const blurHandler = () => setIsInput(false);

  const handleMouseEnter = (category: Category) => {
    setActiveCategory(category);
  };

  const showLeftDiv = () => {
    setIsClicked(true)
  }
  const ids = [365, 55, 59, 57, 58];

  const { data: subCategoryData, isFetching } = useQuery({
    queryKey: ["sub-categories", ids],
    queryFn: () => getSubCategories(ids),
    staleTime: Infinity,
  });

  const activeSubCategory = useMemo(() => {
    if (!subCategoryData || !activeCategory) return [];
    return subCategoryData.filter(
      (subCat) => subCat.parent === activeCategory.id,
    );
  }, [subCategoryData, activeCategory]);

  // console.log(activeSubCategory);

  const { data: searchData = [], isPending: searchLoading } = useQuery<
    SearchResult[]
  >({
    queryKey: ["get-search-result", debouncedInput],
    queryFn: () => getSearchResult(debouncedInput),
    enabled: debouncedInput.trim().length > 0,
    staleTime: 60 * 1000,
  });

  const { data: allCategories } = useQuery({
    queryKey: ["categories"],
    queryFn: getAllCategories,
  });

  // console.log(allCategories);

  return (
    <>
      <header className="flex justify-center gap-15 align-center mt-5 h-auto ">
        <div
          className="relative w-42 h-auto md:w-48 md:h-auto
         p-2 -translate-y-2"
        >
          <Link href="/" className="click:outline-none ">
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
            onFocus={focusHandler}
            onBlur={blurHandler}
            placeholder="دنبال چی میگردی؟"
            className="height-11 rounded-full p-6 bg-gray-100 text-sm
            shadow-md"
          />
          {isInput && (
            <IoClose
              onClick={closeHandler}
              className="absolute left-13 top-4 cursor-pointer"
            />
          )}
          <div
            className={`fixed w-md h-40 rounded-xl pt-4 translate-y-4
          shadow-lg p-3 scrollbar-none overflow-y-auto scroll-fade z-50
           transition duration-300 ${
             isInput
               ? "visible opacity-100 translate-y-0"
               : "invisible opacity-0 translate-y-4"
           }`}
          >
            {searchData.length == 0 ? (
              <SkeletonAvatar />
            ) : (
              <div>
                {searchData?.map((item) => (
                  <Link
                    href={item.permalink}
                    key={item.id}
                    className="flex relative justify-center align-center
             p-2 mb-1 border-b-2 rounded-3xl z-999"
                  >
                    <div className="ml-4 flex ">
                      <img
                        className="w-13 h-13 rounded-lg"
                        src={item.images[0].src}
                        alt=""
                      />
                    </div>

                    <div>
                      <p className="text-xs">{item.name}</p>
                      <span className="text-xs font-bold">
                        {sp(item?.prices.price)} تومان
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
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
            <div className={`fixed flex flex-col justify-between left-0
             top-0 h-full bg-gray-200 p-4 z-999 transition duration-250
              ${isClicked ? "visible opacity-100": "invisible opacity-0"}`}>
                <IoClose onClick={() => setIsClicked(false)} className="absolute left-3"/>
                <p className="relative bottom-1">سبد خرید خالی است.</p>
            </div>

                 {/*  شروع آیکن یوزر و سبد خرید*/}
          <div className="relative group">
            <div
              className="w-13 h-13 border-1 border-gray rounded-full
           justify-center align-center p-2 hover:border-orange-500 transition delay-100
            shadow-md "
            >
              <div className="flex flex-col items-center " >
                <Image className="w-9 h-9 cursor-pointer"onClick={() => setIsClicked(isClicked => !isClicked)}
                 src={userRound} alt="لوگوی کاربری" />

                <div
                  className="absolute w-40 h-50 bg-gray-100 invisible top-10
                opacity-0  transition duration-300 p-3 rounded-lg 
                group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 "
                >
                  <p>تسویه سبد خرید</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative group">
            <div
              className="w-13 h-13 border-1 border-gray rounded-full
           justify-center align-center p-2 hover:border-orange-500 transition delay-100
            shadow-md "
            >
              <div className="flex flex-col items-center ">
                <p className="absolute right-2 w-3 h-3 rounded-full bg-[#000]"></p>
                <Image className="w-9 h-9 cursor-pointer" src={handBag} alt="لوگوی سبد خرید" />

                <div
                  className="absolute w-40 h-50 bg-gray-100 invisible top-10
                opacity-0  transition duration-300 p-3 rounded-lg
                group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 inset-shadow-lg"
                >
                  <p>تسویه سبد خرید</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <nav className="flex mt-5 z-50">
        <div className="">
          <div
            className="relative"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
          >
            <button
              className="flex w-auto text-sm px-4 py-2 items-center justify-center p-2 
              mr-5 bg-orange-500 rounded-3xl text-white text-center cursor-pointer"
            >
              <RxHamburgerMenu size={20} className="ml-3" />
              <span>دسته بندی ها</span>
              <IoIosArrowBack className="mr-2" />
            </button>

            <div className="relative pt-5">
              <div className="flex flex-col">
                <div
                  className={`absolute flex top-full right-5 pt-4 transition duration-300
                ${
                  isOpen
                    ? "visible opacity-100 -translate-x-4"
                    : "invisible opacity-0 translate-y-4 translate-x-4"
                }`}
                >
                  <div className="w-56 rounded-r-xl bg-white/20 p-3 rounded-xl font-light">
                    {categories?.map((category) => {
                      const Icon = CategoryIcons[category.slug];

                      return (
                        <div
                          onMouseEnter={() => handleMouseEnter(category)}
                          key={category.id}
                          className="mb-4 p-2 w-auto justify-center bg-orange-100 rounded-md
                                 -translate-y-2 transition-all duration-300
                                 hover:-translate-x-2"
                        >
                          <button className="flex cursor-pointer">
                            <div className="flex">
                              {Icon && <Icon className="ml-2" />}
                              <span className="font-regular">
                                {category.name}
                              </span>
                            </div>
                            <IoIosArrowBack className="mr-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* ستون دوم */}
                  <div className="w-72 bg-white  p-4 border-r font-light -translate-x-5
                  bg-white/40 p-3 rounded-xl">
                    <Link
                      href={`/products?category=${activeCategory?.id}`}
                      className="text-orange-500"
                    >
                      <p> مشاهده همه {activeCategory?.name}</p>
                    </Link>
                    {activeSubCategory?.map((category) => (
                      <div key={category.id}>
                        <p className="font-light text-md">{category.name}</p>
                      </div>
                    ))}
                  </div>

                  {/* ستون سوم */}
                  <div className="w-64 bg-white p-4 border-r -translate-x-5
                  bg-white/40 p-3 rounded-xl">
                    Banner یا محصولات پیشنهادی
                  </div>
                </div>

                <div
                  className={`w-full transition duration-300 ${
                    isOpen
                      ? "visible opacity-100 -translate-x-4"
                      : "invisible opacity-0 translate-y-4 translate-x-4"
                  }`}
                >
                  <button
                    className="w-full py-3 text-sm bg-orange-400 text-white rounded-xl
               hover:bg-orange-600 cursor-pointer transition-all flex
                items-center justify-center gap-2"
                  >
                    همه دسته بندی ها <IoGrid />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
