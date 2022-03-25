class MyError extends Error {
  status: number;
  
  constructor(message, status: number) {
    super(message);
   // Ensure the name of this error is the same as the class name
    this.name = this.constructor.name;
   // This clips the constructor invocation from the stack trace.
   // It's not absolutely essential, but it does make the stack trace a little nicer.
   //  @see Node.js reference (bottom)
    Error.captureStackTrace(this, this.constructor);
    this.status = status;
  }
}

export class ArticleIndexNotFoundError extends MyError{
  constructor() {
    super(`Article index was not found.`, 404);
  }
}

export class ArticleNotFoundError extends MyError{
  constructor(articleId) {
    super(`Article ${articleId} was not found.`, 404);
  }
}

export class ArticleUploadError extends MyError{
  constructor(articleId) {
    super(`Article ${articleId} was failed to upload.`, 500);
  }
}

export class ArticleIndexUploadError extends MyError{
  constructor() {
    super(`Article index was failed to upload.`, 500);
  }
}