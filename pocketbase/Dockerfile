FROM alpine:3.20

ARG PB_VERSION=0.23.10

RUN apk add --no-cache ca-certificates unzip wget \
  && wget -qO /tmp/pb.zip "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" \
  && unzip /tmp/pb.zip -d /usr/local/bin \
  && chmod +x /usr/local/bin/pocketbase \
  && rm /tmp/pb.zip

COPY pb_migrations /pb_migrations
COPY pb_hooks /pb_hooks

WORKDIR /pb_data
VOLUME /pb_data

EXPOSE 8090

ENTRYPOINT ["/usr/local/bin/pocketbase"]
CMD ["serve", "--http=0.0.0.0:8090", "--dir=/pb_data", "--hooksDir=/pb_hooks", "--migrationsDir=/pb_migrations"]
