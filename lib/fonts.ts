import localFont from 'next/font/local'

export const YekanBakh = localFont({
    src: [
        {
            path: "../assets/fonts/YekanBakh-Regular.woff2",
            weight: "400",
            style: "normal"
        },
        {
            path: "../assets/fonts/YekanBakh-Bold.woff2",
            weight: "700",
            style: "normal"
        },
    ],
    variable: "--font-yekan",
})