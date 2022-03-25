import { DynamoDBClient, PutItemCommand, PutItemCommandOutput } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { HTTPResponse } from "./http-response"
import { Article, ArticleIndex, PlainArticle, StatusCode, ArticleMetadata } from "./model";
import axios from "axios";
import { ArticleIndexNotFoundError, ArticleIndexUploadError, ArticleNotFoundError, ArticleUploadError } from "./error";
import { SQSClient, ReceiveMessageCommand, ReceiveMessageCommandOutput, DeleteMessageCommand, DeleteMessageCommandOutput } from "@aws-sdk/client-sqs";

const dynamodbClient = new DynamoDBClient({ region: "us-east-1" });
const sqsClient = new SQSClient({ region: "us-east-1" });

const putArticle = async (article: Article): Promise<StatusCode> => {
  const objectInDynamoDB = marshall(article, {convertClassInstanceToMap: true})
  const command: PutItemCommand = new PutItemCommand({Item: objectInDynamoDB, TableName: "articles"});
  const response: PutItemCommandOutput = await dynamodbClient.send(command);
  return response.$metadata.httpStatusCode
}

const rewriteArticleIndex = (articleIndex: ArticleIndex, article: Article, index: [number, number]): ArticleIndex => {
  // Handle new article

  articleIndex["body"][index[0]][index[1]] = {
    firstPublished: article["firstPublished"],
    lastModified: article["lastModified"],
    title: article["title"],
    subtitle: article["subtitle"],
    type: article["type"],
    edition: article["edition"],
    views: article["views"]
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
   * Return the page number of existed article in the index, or "0" for new article
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

const rewriteArticle = (articleIndex: ArticleIndex, article: Article, index: [number, number]): Article => {
  article["edition"] = articleIndex["body"][index[0]][index[1]]["edition"] + 1;
  return article;
}

const pollMessage = async (): Promise<number> => {
  const receiveCommand: ReceiveMessageCommand = new ReceiveMessageCommand({QueueUrl: "https://sqs.us-east-1.amazonaws.com/730917489165/article-reader-count", MaxNumberOfMessages: 1});
  const receiveResponse: ReceiveMessageCommandOutput = await sqsClient.send(receiveCommand);
  if (receiveResponse.$metadata.httpStatusCode == 200){
    console.log(receiveResponse["Messages"][0]["Body"])
    const deleteCommand: DeleteMessageCommand = new DeleteMessageCommand({QueueUrl: "https://sqs.us-east-1.amazonaws.com/730917489165/article-reader-count", ReceiptHandle: receiveResponse["Messages"][0]["ReceiptHandle"]});
    const deleteResponse: DeleteMessageCommandOutput = await sqsClient.send(deleteCommand);
    return deleteResponse["$metadata"]["httpStatusCode"]
  }else{
    return null;
  }
}

exports.lambdaHandler = async (event, context) => {
  /**
   * 1) Poll queue message
   * 2) Delete queue message
   * 2) Get article based on message
   * 3) Get the article index
   * 4) Update article's views
   * 5) Update article's views in article index
   * 6) If article do not exist, throw error
   * 7) Put article to db
   * 7) Update article index based on article
   * 8) Put article index to db
   */
  try {
    await pollMessage()
    // const id: number = +event["queryStringParameters"]['id']
    // const plainArticle: PlainArticle = JSON.parse(event["body"]);
    // var article: Article = new Article(plainArticle, id);

    // const articleIndexResponse: any = await axios.get("https://7ey4ou4hpc.execute-api.us-east-1.amazonaws.com/prod/article-index")
    // if (articleIndexResponse["status"] == 404) throw new ArticleIndexNotFoundError();
    // var articleIndex: ArticleIndex = articleIndexResponse["data"] as ArticleIndex;

    // const pageIndex: [number, number] = articleIsExisted(articleIndex, article);
    // if (pageIndex[0] == -1 || pageIndex[1] == -1) throw new ArticleNotFoundError(article["firstPublished"]);

    // article = rewriteArticle(articleIndex, article, pageIndex)
    // const articleStatusCode = await putArticle(article);
    // if (articleStatusCode != 200) throw new ArticleUploadError(article["firstPublished"]);

    // articleIndex = rewriteArticleIndex(articleIndex, article, pageIndex)
    // const indexStatusCode = await putArticleIndex(articleIndex);
    // if (indexStatusCode != 200) throw new ArticleIndexUploadError();

    // return new HTTPResponse(200, JSON.stringify(article));
    return new HTTPResponse(200, "")
  } catch (err) {
    console.error(err);
    return new HTTPResponse(err["status"], JSON.stringify({"Error Message: ": err["message"]}));
  }
};
