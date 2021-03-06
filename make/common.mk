#
# Makefile to define some common toolkit make targets
# Copyright (c) 2015 Cyan, Inc. All rights reserved.
#

SHELL := /bin/bash
HIDE ?= @
ENV ?= $(HIDE)source env.sh &&
VERSION := $(shell grep -o '"version":.*",' package.json | awk '{ print $$2; }' | sed -e 's/[",]//g')
IS_BEAKER ?= 0

BEAKER_BIN ?= beaker

.PHONY: \
	build \
	lint \
	package-test \
	update-eslintrc \
	version-bumped \
	bump-version

build:
	$(ENV)grunt build

lint:
ifeq ($(IS_BEAKER), 1)
	-$(ENV)cmp .eslintrc files/project-templates/common/.eslintrc || echo "warning '.eslintrc' and 'files/project-templates/common/.eslintrc' are different."
else
	-$(ENV)cmp .eslintrc node_modules/beaker/.eslintrc || echo "warning '.eslintrc' is out of date, run 'make update-eslintrc' for latest version."
endif
	$(ENV)grunt lint

package-test:
	$(HIDE) echo "WARNING: the package-test target is DEPRECATED, please remove it from your Makefile."

update-eslintrc:
ifeq ($(IS_BEAKER), 1)
	$(ENV)echo "For beaker you must manually update the '.eslintrc' file." 1>&2
else
	$(ENV)cp node_modules/beaker/.eslintrc .eslintrc
endif

version-bumped:
ifndef REPO
	$(error REPO variable needs to be set)
else
	$(HIDE)echo "Checking that PR for current commit has version bump comment"
	$(ENV)$(BEAKER_BIN) github version-bumped --repo $(REPO) --sha $(shell git rev-parse HEAD)
endif

bump-version:
ifndef REPO
	$(error REPO variable needs to be set)
else
	$(HIDE)echo "Bumping version"
	$(ENV)$(BEAKER_BIN) github bump-version --repo $(REPO)
endif
