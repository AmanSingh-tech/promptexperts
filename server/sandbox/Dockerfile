FROM alpine:3.20
RUN apk add --no-cache g++ python3 nodejs coreutils
COPY run-tests.sh /usr/local/bin/run-tests
RUN chmod 755 /usr/local/bin/run-tests
USER 65534:65534
WORKDIR /tmp
ENTRYPOINT ["/usr/local/bin/run-tests"]
