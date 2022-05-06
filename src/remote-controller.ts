import { DynamoDBClient, PutItemCommand, PutItemCommandOutput, UpdateItemCommand, UpdateItemCommandOutput } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { HTTPResponse } from "./http-response"
import { Article, ArticleIndex, PlainArticle, StatusCode, ArticleMetadata } from "./model";
import axios, { AxiosResponse } from "axios";
import { ArticleIndexNotFoundError, ArticleIndexUploadError, ArticleNotFoundError, ArticleUploadError } from "./error";
import { SQSHandler, SQSEvent } from "aws-lambda";

const dynamodbClient = new DynamoDBClient({ region: "us-east-1" });

const rewriteArticleIndex = (articleIndex: ArticleIndex, article: Article, index: [number, number]): ArticleIndex => {
  // Handle new article
  articleIndex["body"][index[0]][index[1]] = {
    firstPublished: article["firstPublished"],
    lastModified: article["lastModified"],
    title: article["title"],
    subtitle: article["subtitle"],
    type: article["type"],
    edition: article["edition"],
    views: article["views"],
    tags: article["tags"],
    series: article["series"]
  }

  articleIndex["lastModified"] = article["lastModified"];
  return articleIndex;
}

const putArticleIndex = async (articleIndex: ArticleIndex): Promise<number> => {
  const objectInDynamoDB = marshall(articleIndex, {convertClassInstanceToMap: true})
  const command: PutItemCommand = new PutItemCommand({Item: objectInDynamoDB, TableName: "article-index"});
  const response: PutItemCommandOutput = await dynamodbClient.send(command);
  return response.$metadata.httpStatusCode
}

const articleIsExisted = (articleIndex: ArticleIndex, article: Article): [number, number] => {
  /**
   * Return the location(index) of existed article in the article index, or [-1, -1] for new article
   */
  var res: [number, number] = [-1, -1];

  for (var i = 0; i < articleIndex["body"].length; i++){
    for (var j = 0; j < articleIndex["body"][i].length; j++){
      if (articleIndex["body"][i][j]["firstPublished"] == article["firstPublished"]){
        res = [i, j];
        return res;
      }
    }
  }
  return res;
}

const rewriteArticle = (article: Article): Article => {
  article["views"] = article["views"] + 1
  return article;
}

const putArticle = async (article: Article): Promise<StatusCode> => {
  const objectInDynamoDB = marshall(article, {convertClassInstanceToMap: true})
  const command: PutItemCommand = new PutItemCommand({Item: objectInDynamoDB, TableName: "articles"});
  const response: PutItemCommandOutput = await dynamodbClient.send(command);
  return response.$metadata.httpStatusCode
}

const updateArticle = async (firstPublished: number, lastModified: number): Promise<StatusCode> => {
  const command: UpdateItemCommand = new UpdateItemCommand({
    Key: {
      "firstPublished": {'N': firstPublished.toString()},
      "lastModified": {'N': lastModified.toString()}
    },
    UpdateExpression: 'SET #views = #views + :incr',    
    ExpressionAttributeValues: { ':incr': {'N': '1'}},
    ExpressionAttributeNames: { "#views": "views"},
    TableName: "articles"
  });
  const response: PutItemCommandOutput = await dynamodbClient.send(command);
  return response.$metadata.httpStatusCode
}

interface SQSRecord{
  messageId: string,
  receiptHandle: string,
  body: string,
  attributes: any
  messageAttributes: any
  md5OfBody: string
  eventSource: string
  eventSourceARN: string
  awsRegion: string
}

exports.lambdaHandler = async (event: SQSEvent, context) => {
  /**
   * 1) Get message list from event, and loop the following
   * 2) Get article id from message
   * 3) Get the article index
   * 4) Get the article based on article id
   * 4) Update article's views, and put article to db
   * 5) Update article's views in article index, and put article index to db
   */
  try {
    const messageList: SQSRecord[] = event["Records"]
    var processedMessage = [];
    console.log("message length is: " + messageList.length)

    for (var message of messageList){
      const id: string = message["body"]
      console.log("message is: " + id)

      const articleResponse: AxiosResponse = await axios.get(`https://${process.env.API_ID}.execute-api.us-east-1.amazonaws.com/prod/article?id=${id}`)
      if (articleResponse["status"] == 404) throw new ArticleNotFoundError(id);
      var article: Article = articleResponse["data"] as Article;

      const articleIndexResponse: AxiosResponse = await axios.get(`https://${process.env.API_ID}.execute-api.us-east-1.amazonaws.com/prod/article-index`)
      if (articleIndexResponse["status"] == 404) throw new ArticleIndexNotFoundError();
      var articleIndex: ArticleIndex = articleIndexResponse["data"] as ArticleIndex;

      const pageIndex: [number, number] = articleIsExisted(articleIndex, article);
      if (pageIndex[0] == -1 || pageIndex[1] == -1) throw new ArticleNotFoundError(article["firstPublished"]);

      // article = rewriteArticle(article)
      // const articleStatusCode: number = await putArticle(article);
      const articleStatusCode: number = await updateArticle(article["firstPublished"], article["lastModified"]);
      if (articleStatusCode != 200) throw new ArticleUploadError(article["firstPublished"]);

      articleIndex = rewriteArticleIndex(articleIndex, article, pageIndex)
      const indexStatusCode: number = await putArticleIndex(articleIndex);
      if (indexStatusCode != 200) throw new ArticleIndexUploadError();

      processedMessage.push(id)
    };

    return new HTTPResponse(200, JSON.stringify(processedMessage));
  } catch (err) {
    console.error(err);
    return new HTTPResponse(err["status"], JSON.stringify({"Error Message: ": err["message"]}));
  }
};
