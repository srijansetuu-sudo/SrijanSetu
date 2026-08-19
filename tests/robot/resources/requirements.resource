*** Settings ***
Resource    common.resource

*** Keywords ***
Create Requirement
    [Arguments]    ${customer_token}    ${title}=Robot Custom Gift
    ${payload}=    Create Dictionary
    ...    title=${title}
    ...    description=Custom product requirement created by Robot Framework
    ...    budget_min=${100}
    ...    budget_max=${500}
    ...    deadline=${None}
    ...    ai_generated_reference=https://example.com/reference-ai.png
    ${response}=    POST API    ${API_PREFIX}/requirements    ${payload}    ${customer_token}
    ${body}=    Response Should Be Success    ${response}
    ${requirement_id}=    Set Variable    ${body["data"]["requirement"]["id"]}
    Set Suite Variable    ${REQUIREMENT_ID}    ${requirement_id}
    RETURN    ${response}

List Requirements
    ${response}=    GET API    ${API_PREFIX}/requirements
    RETURN    ${response}

Get Requirement
    [Arguments]    ${requirement_id}
    ${response}=    GET API    ${API_PREFIX}/requirements/${requirement_id}
    RETURN    ${response}

Update Requirement
    [Arguments]    ${customer_token}    ${requirement_id}    ${title}=Updated Robot Requirement
    ${payload}=    Create Dictionary    title=${title}    description=Updated requirement description    budget_min=${150}    budget_max=${600}
    ${response}=    PATCH API    ${API_PREFIX}/requirements/${requirement_id}    ${payload}    ${customer_token}
    RETURN    ${response}

Delete Requirement
    [Arguments]    ${customer_token}    ${requirement_id}
    ${response}=    DELETE API    ${API_PREFIX}/requirements/${requirement_id}    ${customer_token}
    RETURN    ${response}

Add Requirement Reference
    [Arguments]    ${customer_token}    ${requirement_id}
    ${payload}=    Create Dictionary    image_url=https://example.com/reference.png
    ${response}=    POST API    ${API_PREFIX}/requirements/${requirement_id}/references    ${payload}    ${customer_token}
    RETURN    ${response}

My Requirements
    [Arguments]    ${token}
    ${response}=    GET API    ${API_PREFIX}/requirements/my    ${token}
    RETURN    ${response}

