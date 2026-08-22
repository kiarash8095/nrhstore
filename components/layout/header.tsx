"use client";

import styles from "./header.module.css";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";
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
import { Category, SubCategory } from "@/types/category";
import { SearchResult } from "@/types/search-result";
import {
  getAllCategories,
  getMainCategories,
  getSubCategories,
} from "@/services/categories";
import { sp } from "@/utils/numbers";
import { SkeletonAvatar } from "../skeleton/searchResultSkeleton";
import { Skeleton } from "../ui/skeleton";

interface HeaderProps {
  categories: Category[];
}

export default function Header({ categories }: HeaderProps) {
  const [input, setInput] = useState("");
  const [isInput, setIsInput] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);

  const debouncedInput = useDebounce(input, 500);

  const queryClient = useQueryClient();

  const inputHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);

    // setIsInput(true);
  };

  const closeHandler = () => setIsInput(false);
  const focusHandler = () => setIsInput(true);
  const blurHandler = () => setIsInput(false);

  const ids = [55, 365, 57, 58, 59];

  const handleMouseEnter = (category: Category) => {
    setActiveCategory(category);
    queryClient.prefetchQuery({
      queryKey: ["sub-category", category?.id],
      queryFn: () => getSubCategories(category.id),
      staleTime: 1000 * 60 * 10,
    });
  };
  const {
    data: subCategoryData = [],
    isPending,
    isFetching,
  } = useQuery<SubCategory[]>({
    queryKey: ["sub-category", activeCategory?.id],
    queryFn: () => getSubCategories(activeCategory!.id),
    enabled: !!activeCategory?.id,
    staleTime: 1000 * 60 * 10,
  });
  console.log(subCategoryData);

  const { data: searchData = [], isPending: searchLoading } = useQuery<
    SearchResult[]
  >({
    queryKey: ["get-search-result", debouncedInput],
    queryFn: () => getSearchResult(debouncedInput),
    enabled: debouncedInput.trim().length > 0,
    staleTime: 60 * 1000,
  });

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
          <div
            className={`fixed flex flex-col justify-between left-0
             top-0 h-full bg-gray-200 p-4 z-999 transition duration-250
              ${isClicked ? "visible opacity-100" : "invisible opacity-0"}`}
          >
            <IoClose
              onClick={() => setIsClicked(false)}
              className="absolute left-3"
            />
            <p className="relative bottom-1">سبد خرید خالی است.</p>
          </div>

          {/*  شروع آیکن یوزر و سبد خرید*/}
          <div className="relative group">
            <div
              className="w-13 h-13 border-1 border-gray rounded-full
           justify-center align-center p-2 hover:border-orange-500 transition delay-100
            shadow-md "
            >
              <div className="flex flex-col items-center ">
                <Image
                  className="w-9 h-9 cursor-pointer"
                  onClick={() => setIsClicked((isClicked) => !isClicked)}
                  src={userRound}
                  alt="لوگوی کاربری"
                />

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
                <Image
                  className="w-9 h-9 cursor-pointer"
                  src={handBag}
                  alt="لوگوی سبد خرید"
                />

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

      <nav className="flex mt-5">
        {/* این wrapper باید هم Button و هم Mega Menu را در بر بگیرد */}
        <div
          className="relative"
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          {/* Trigger Button */}
          <button
            type="button"
            className="
              flex
              items-center
              justify-center
              w-50
              px-4
              py-2
              mr-5
              bg-orange-500
              rounded-3xl
              text-white
              cursor-pointer
            "
          >
            <RxHamburgerMenu size={20} className="ml-3" />

            <span>دسته بندی ها</span>

            <IoIosArrowBack
              className={`mr-2 transition-transform duration-200 ${
                isOpen ? "-rotate-90" : ""
              }`}
            />
          </button>

          {/* Mega Menu */}
          <div
            className={`
              absolute
              top-full
              right-5
              z-50
              pt-3

              transition-all
              duration-200
              ease-out

              ${
                isOpen
                  ? "visible opacity-100 translate-y-0"
                  : "invisible opacity-0 translate-y-2 pointer-events-none"
              }
            `}
          >
            <div
              className="
                flex
                items-start
                gap-2
                p-2
                bg-white
                rounded-xl
                shadow-xl
                border
                border-gray-100
                min-w-[700px]
              "
            >
              {/* ========================= */}
              {/* ستون اول - Categories */}
              {/* ========================= */}

              <div className="w-52">
                <div className="mb-2 px-3 py-2">
                  <span className="text-sm font-bold">دسته بندی ها</span>
                </div>

                <div className="flex flex-col gap-1">
                  {categories?.map((category) => (
                    <Link
                      href={`/products/category/${category.slug}`}
                      key={category.id}
                      type="button"
                      onMouseEnter={() => handleMouseEnter(category)}
                      className="
                        flex
                        items-center
                        justify-between
                        w-full
                        px-3
                        py-3
                        rounded-lg
                        text-sm
                        text-right
                        font-bold
                        hover:bg-orange-50
                        hover:text-orange-500
                        transition-colors
                        duration-150
                        cursor-pointer
                      "
                    >
                      <span>{category.name}</span>

                      <IoIosArrowBack size={16} />
                    </Link>
                  ))}
                </div>
              </div>

              {/* ========================= */}
              {/* ستون دوم */}
              {/* ========================= */}

              <div className="w-60 min-h-[300px] border-r pr-2 transition-all duration-300">
                <div className="mb-2 px-3 py-2">
                  <Link href={`/products/category/${activeCategory?.slug}`}>
                    <p className="text-sm">
                      مشاهده ی همه {activeCategory?.name}
                    </p>
                  </Link>
                </div>

                <div className="flex flex-col gap-1">
                  {isPending || isFetching ? (
                    <>
                      <Skeleton className="h-6 w-full rounded-md" />
                      <Skeleton className="h-6 w-5/6 rounded-md" />
                      <Skeleton className="h-6 w-4/5 rounded-md" />
                      <Skeleton className="h-6 w-3/4 rounded-md" />
                      <Skeleton className="h-6 w-4/5 rounded-md" />
                    </>
                  ) : (
                    <>
                      {subCategoryData.map((category) => (
                        <div key={category.id}>
                          <p className="text-normal">{category.name}</p>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* ========================= */}
              {/* ستون سوم */}
              {/* ========================= */}

              <div className="w-60 min-h-[300px] border-r pr-2">
                <div className="mb-2 px-3 py-2">
                  <span className="text-sm font-bold">محصولات</span>
                </div>

                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    className="
                      w-full
                      px-3
                      py-2
                      text-right
                      text-sm
                      rounded-lg
                      hover:bg-gray-100
                      transition
                    "
                  >
                    محصول اول
                  </button>

                  <button
                    type="button"
                    className="
                      w-full
                      px-3
                      py-2
                      text-right
                      text-sm
                      rounded-lg
                      hover:bg-gray-100
                      transition
                    "
                  >
                    محصول دوم
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
