
exports.handler = async (event: any) => {    

    return {
        statusCode: 200,
        headers: { "Content-Type": "text/json" },
        body: JSON.stringify({ message: "Hello world!" }),
    };
};