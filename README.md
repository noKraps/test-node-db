# Install
```
git clone
docker--compose up -d --build
```

# RabbiMQ message formats
### Get
```
Exchange	node-db.income
Routing Key	get
Payload         {"key": "foo"}
```

### Set
```
Exchange	node-db.income
Routing Key	set
Payload         {"key": "foo", "value": "bar"}
```

### Delete
```
Exchange	node-db.income
Routing Key	delete
Payload         {"key": "foo"}
```

### Clear
```
Exchange	node-db.income
Routing Key	clear
Payload         none
```

### Response queue
```
Exchange	node-db.outcome
Routing Key	response
Payload         none
```

# Description
Snapshots are encoded and compressed using zlib, recovery from snapshots is not implemented. There is also a log strategy, which is used every time the service is launched.

Client service - outputs responses from RabbitMQ to the console for convenience.
