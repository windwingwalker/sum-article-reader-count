export type StatusCode = number;

export interface PlainArticle{
  firstPublished: number;
  title: string;
  subtitle: string;
  type: string;
  tags: string[];
  series: string;
  body: {
    [key: string]: string;
  }[];
}

export interface Article{
  firstPublished: number;
  lastModified: number;
  title: string;
  subtitle: string;
  type: string;
  edition: number;
  views: number;
  tags: string[];
  series: string;
  body: {
    [key: string]: string;
  }[];
}

export interface ArticleIndex{
  id: string;
  lastModified: number;
  count: number;
  body: ArticleMetadata[][];
}

export interface ArticleMetadata{
  firstPublished: number;
  lastModified: number;
  title: string;
  subtitle: string;
  type: string;
  edition: number;
  views: number;
  tags: string[];
  series: string;
}