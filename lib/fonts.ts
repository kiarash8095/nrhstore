import localFont from 'next/font/local'

export const YekanBakh = localFont({
    src: [
        {
            path: "../public/fonts/yekan-bakh-medium.woff",
            weight: "300",
            style: "light"
        },
        {
            path: "../public/fonts/YekanBakh-Regular.woff2",
            weight: "400",
            style: "normal"
        },
        {
            path: "../public/fonts/YekanBakh-Bold.woff2",
            weight: "700",
            style: "bold"
        },
    ],
    variable: "--font-yekan",
})