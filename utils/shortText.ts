export function shortText(
    text:string,
     options:{
        wordsCount?: number;
        suffix?: string;
        minLength?: number;
    } ={}
): string{

    const {wordsCount=5, suffix="...", minLength=10} = options

    if(!text || text.trim().length === 0) {
        return"";
        }

    if(text.length <= minLength)
    {
        return text;
    }

    const words = text.trim().split(/\s+/u)

    if(words.length <= wordsCount)
    {
        return text;
    }

    return words.slice(0, wordsCount).join(' ') + suffix;

    
}

export function removeExtra(word:string)
{
    return word.replace(/&#\d+;/g, "").replace(/&[a-zA-Z]+;/g, "").trim();
}