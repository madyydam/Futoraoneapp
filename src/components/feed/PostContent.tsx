import { memo, useMemo } from "react";
import DOMPurify from "dompurify";

interface PostContentProps {
  content: string;
  onClick: () => void;
}

export const PostContent = memo(({ content, onClick }: PostContentProps) => {
  const sanitizedContent = useMemo(
    () =>
      DOMPurify.sanitize(content.replace(/\n/g, "<br />"), {
        ALLOWED_TAGS: ["b", "i", "em", "strong", "br", "code", "pre", "p"],
        ALLOWED_ATTR: [],
        ALLOW_DATA_ATTR: false,
      }),
    [content]
  );

  return (
    <div
      className="mb-4 prose dark:prose-invert max-w-none cursor-pointer hover:opacity-90 transition-opacity leading-relaxed"
      onClick={onClick}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
});

PostContent.displayName = "PostContent";
