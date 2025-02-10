import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

const ERROR_PAGE = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Oops! Something Went Wrong</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        background-color: #f7f9fc;
        color: #333;
        text-align: center;
      }
      .container {
        max-width: clamp(300px, 95%, 800px);
        padding: 20px;
        background: #fcf8f0;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        border-radius: 10px;
      }
      h1 {
        font-size: clamp(1.25rem, 1.5vw, 3rem);
        color: #e9902c;
      }
      p {
        font-size: clamp(0.85rem, 1vw, 1.2rem);
        margin: 20px 0;
        color: #555;
      }
      .email {
        color: #007bff;
        text-decoration: none;
        font-weight: bold;
      }
      .email:hover {
        text-decoration: underline;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Oops! Something Went Wrong</h1>
      <p>
        We're sorry for the hiccup! It looks like something went wrong on our end. Our team has been notified and is
        already on it.
      </p>
      <p>
        Please try again in a bit. If the issue persists, we'd appreciate it if you could
        <a class="email" href="mailto:team@focusbear.io">email us</a> with details about what you were doing when this
        happened. Thank you for your patience!
      </p>
    </div>
  </body>
</html>

`;

@Catch(HttpException)
export class BadGatewayExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = exception?.getStatus() || 500;
    const message = status === HttpStatus.BAD_GATEWAY ? ERROR_PAGE : exception.message;

    response.status(status);
    response.send(message);
  }
}
