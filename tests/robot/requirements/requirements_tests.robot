*** Settings ***
Documentation    Requirement CRUD, ownership, and authorization tests.
Resource         ../resources/common.resource
Resource         ../resources/auth.resource
Resource         ../resources/requirements.resource
Suite Setup      Setup Requirements Suite
Suite Teardown   Stop API Session

*** Keywords ***
Setup Requirements Suite
    Start API Session
    Login As Customer
    Login As Creator
    ${other_email}=    Generate Unique Email    other.customer
    ${other_token}    ${other_refresh}    ${other_user}=    Ensure User And Login    ${other_email}    ${CUSTOMER_PASSWORD}    CUSTOMER    Other Customer
    Set Suite Variable    ${OTHER_CUSTOMER_TOKEN}    ${other_token}

*** Test Cases ***
Customer Creates Requirement
    ${response}=    Create Requirement    ${CUSTOMER_TOKEN}    Robot Requirement CRUD
    ${body}=    Response Should Be Success    ${response}
    Should Be UUID    ${body["data"]["requirement"]["id"]}

Creator Cannot Create Requirement
    ${payload}=    Create Dictionary
    ...    title=Creator Forbidden Requirement
    ...    description=Creator should not create requirements
    ...    budget_min=${100}
    ...    budget_max=${500}
    ${response}=    POST API    ${API_PREFIX}/requirements    ${payload}    ${CREATOR_TOKEN}
    Response Should Be Error    ${response}    403

List Requirements
    ${response}=    List Requirements
    ${body}=    Response Should Be Success    ${response}
    Dictionary Should Contain Key    ${body["data"]}    items

Get Requirement
    ${response}=    Get Requirement    ${REQUIREMENT_ID}
    ${body}=    Response Should Be Success    ${response}
    Should Be Equal    ${body["data"]["requirement"]["id"]}    ${REQUIREMENT_ID}

Customer Updates Own Requirement
    ${response}=    Update Requirement    ${CUSTOMER_TOKEN}    ${REQUIREMENT_ID}    Requirement Updated By Owner
    ${body}=    Response Should Be Success    ${response}
    Should Be Equal    ${body["data"]["requirement"]["title"]}    Requirement Updated By Owner

Other User Cannot Modify Requirement
    ${response}=    Update Requirement    ${OTHER_CUSTOMER_TOKEN}    ${REQUIREMENT_ID}    Other User Update Attempt
    Response Should Be Error    ${response}    403

Add Requirement Reference Image
    ${response}=    Add Requirement Reference    ${CUSTOMER_TOKEN}    ${REQUIREMENT_ID}
    ${body}=    Response Should Be Success    ${response}
    Should Be Equal    ${body["data"]["reference"]["requirement_id"]}    ${REQUIREMENT_ID}

My Requirements Endpoint
    ${response}=    My Requirements    ${CUSTOMER_TOKEN}
    ${body}=    Response Should Be Success    ${response}
    Dictionary Should Contain Key    ${body["data"]}    items

Customer Deletes Own Requirement
    ${new_req}=    Create Requirement    ${CUSTOMER_TOKEN}    Requirement To Delete
    ${new_body}=    Response Should Be Success    ${new_req}
    ${delete_id}=    Set Variable    ${new_body["data"]["requirement"]["id"]}
    ${response}=    Delete Requirement    ${CUSTOMER_TOKEN}    ${delete_id}
    Response Should Be Success    ${response}
