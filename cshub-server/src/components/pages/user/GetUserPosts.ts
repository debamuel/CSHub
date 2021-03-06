import {app} from "../../../";
import {GetUserPostsCallback, GetUserPosts} from "../../../../../cshub-shared/src/api-calls";
import {Request, Response} from "express";
import {DatabaseResultSet, query} from "../../../utilities/DatabaseConnection";
import {checkTokenValidity} from "../../../auth/AuthMiddleware";

app.post(GetUserPosts.getURL, (req: Request, res: Response) => {

    const userDashboardRequest = req.body as GetUserPosts;

    const token = checkTokenValidity(req);

    if (token.valid) {
        query(`
        SELECT hash
        FROM posts
        WHERE author = ? AND deleted = 0  
        ORDER BY datetime DESC
        `, token.tokenObj.user.id)
            .then((result: DatabaseResultSet) => {

                const hashes: number[] = [];

                result.convertRowsToResultObjects().forEach((x) => {
                    hashes.push(x.getNumberFromDB("hash"));
                });

                res.json(new GetUserPostsCallback(hashes));
            });
    } else {
        res.status(401).send();
    }
});
