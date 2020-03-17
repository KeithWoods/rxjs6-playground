export const log = (message: any) => {
    console.log(message);
};

export const Logger = {
    create: (name) => {
        return {
            info: (message) => console.log(message),
            debug: (message) => console.log(message),
            error: (message) => console.log(message),
        };
    }
};
