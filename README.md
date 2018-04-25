# Proxy API for Discogs

- your app starts at `server.js`
- add frameworks and packages in `package.json`
- safely store app secrets in `.env` (nobody can see this but you and people you invite)

How was this made?

1. [Redis database on IBM Cloud](https://www.ibm.com/blogs/bluemix/2018/02/ibm-cloud-compose-redis-available-tls-encryption/)
2. Express 


How to test cache speed in the terminal

```shell
for x in 1 2 3 4 5 6 7 8 9 10
  curl -s https://edapi.glitch.me/releases/6980600 -o /dev/null -w "\n {time_total}"
end
```
