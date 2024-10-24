
exports.handler = async (event: any) => {    
    console.log(event)
    // event.requestContent.http.path  event.requestContent.http.method  will be useful
    // event.queryStringParameters contains an object of query params.
    // event.headers is an object of all headers.
    
    return {
        statusCode: 200,
        headers: { "Content-Type": "text/json" },
        body: JSON.stringify({ message: "Hello world!" }),
    };
};