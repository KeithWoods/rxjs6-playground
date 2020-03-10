"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("rxjs");
// pipe(
//     of(1, 2, 3),
// )
function doOnSubscribe(action) {
    return (source) => new rxjs_1.Observable((subscriber) => {
        action();
        let subscription = source.subscribe(subscriber);
        return () => {
            console.log(`Unsubscribing`);
            subscription.unsubscribe();
        };
    });
}
exports.doOnSubscribe = doOnSubscribe;
rxjs_1.of(1, 2, 3)
    .pipe(doOnSubscribe(() => { console.log(`Hello`); }))
    .subscribe(x => {
    console.log(x);
});
