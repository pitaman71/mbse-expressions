"""The POSIX family: the regular expressions POSIX defines (IEEE Std 1003.1, ISO/IEC/IEEE 9945; its Base Definitions,
chapter 9), named as its standard names itself. Its dialects: `BRE`, basic regular expressions (XBD 9.3), and `ERE`,
extended regular expressions (XBD 9.4), each with grep's list of patterns; awk's EREs are ERE's, its escapes a way of
printing them. C++'s `std::regex` reads them where a regex's flags name a POSIX grammar (`Cpp.RegExp`). Each imports
its modules from its own path, e.g. `from mbse.Expressions.POSIX.BRE import Text`."""
