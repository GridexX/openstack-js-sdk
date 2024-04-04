
# GET servers:
GET {{host}}/servers

HTTP 200
[Asserts]
jsonpath "$[0].name" == "minikube-vm"
jsonpath "$[0].name" isString
jsonpath "$[0].id" isString
[Captures]
server_id: jsonpath "$.[0].id"


# GET server:
GET {{host}}/servers/{{server_id}}
HTTP 200
[Asserts]
jsonpath "$.server.id" == "{{server_id}}"
jsonpath "$.server.name" isString
jsonpath "$.server.status" == "ACTIVE"
jsonpath "$.server.tenant_id" isString
jsonpath "$.server.user_id" isString

# Get images
GET {{host}}/images
HTTP 200
[Asserts]
jsonpath "$.images[0].name" isString
jsonpath "$.images[0].size" isInteger
jsonpath "$.images[0].id" isString
jsonpath "$.images[0].status" isString
jsonpath "$.images[0].protected" isBoolean
jsonpath "$.images[0].min_ram" isInteger
jsonpath "$.images[0].min_disk" isInteger
jsonpath "$.images[0].disk_format" isString

# Get metrics
GET {{host}}/metrics
HTTP 200
[Asserts]
jsonpath "$[0].id" isString
jsonpath "$[0].creator" isString
jsonpath "$[0].name" isString
jsonpath "$[0].unit" isString
jsonpath "$[0].resource_id" isString
jsonpath "$[0].created_by_user_id" isString
jsonpath "$[0].created_by_project_id" isString
jsonpath "$[0].archive_policy.name" isString
jsonpath "$[0].archive_policy.back_window" isInteger
[Captures]
metric_id: jsonpath "$[0].id"
metric_creator: jsonpath "$[0].creator"

# Get metric
GET {{host}}/metrics/{{metric_id}}
HTTP 200
[Asserts]
jsonpath "$.id" == "{{metric_id}}"
jsonpath "$.creator" == "{{metric_creator}}"

# Get Metric measuress
GET {{host}}/metrics/{{metric_id}}/measure
HTTP 200
[Asserts]
jsonpath "$[0][0]" isString
jsonpath "$[0][1]" isInteger
jsonpath "$[0][2]" isFloat

# Get limits
GET {{host}}/limits
HTTP 200
[Asserts]
jsonpath "$.limits.absolute.maxTotalInstances" isInteger
jsonpath "$.limits.absolute.maxTotalRAMSize" isInteger
jsonpath "$.limits.absolute.maxTotalCores" isInteger
jsonpath "$.limits.absolute.maxTotalKeypairs" isInteger
jsonpath "$.limits.absolute.maxTotalFloatingIps" isInteger
jsonpath "$.limits.absolute.maxSecurityGroups" isInteger
jsonpath "$.limits.absolute.totalInstancesUsed" isInteger