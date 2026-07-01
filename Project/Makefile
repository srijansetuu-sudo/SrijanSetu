.PHONY: test-api test-api-parallel test-api-auth test-api-orders

test-api:
	robot -d reports tests/robot

test-api-parallel:
	pabot --processes 4 -d reports tests/robot

test-api-auth:
	robot -d reports tests/robot/auth/auth_tests.robot

test-api-orders:
	robot -d reports tests/robot/orders/orders_tests.robot

