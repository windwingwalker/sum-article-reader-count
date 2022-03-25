type Timestamp = number;
type ArticleTitle = string;
type Edition = number;
export type StatusCode = number;

export interface PlainArticle{
  firstPublished: number;
  title: ArticleTitle;
  subtitle: ArticleTitle;
  type: string;
  body: {
    [key: string]: string;
  }[];
}

export class Article{
  firstPublished: Timestamp;
  lastModified: Timestamp;
  title: ArticleTitle;
  subtitle: ArticleTitle;
  type: string;
  edition: number;
  views: number;
  body: {
    [key: string]: string;
  }[];

  constructor(data: PlainArticle, id: number){
    this.firstPublished = id;
    this.lastModified = Date.now();
    this.title = data["title"];
    this.subtitle = data["subtitle"];
    this.type = data["type"];
    this.edition = 1;
    this.views = 0;
    this.body = data["body"];
  }
}

export interface ArticleIndex{
  id: string;
  lastModified: Timestamp;
  count: number;
  body: ArticleMetadata[][];
}

export interface ArticleMetadata{
  firstPublished: Timestamp;
  lastModified: Timestamp;
  title: ArticleTitle;
  subtitle: ArticleTitle;
  type: string;
  edition: Edition;
  views: number
}